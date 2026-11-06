import * as SQLite from 'expo-sqlite';
import { getDb as getSharedDb } from '../storage/kv';
import type { Category } from '../data/categories';
import { makeList, type GroceryItem, type GroceryList, type ShareIdentity } from '../data/list';
import { sanitizePreferences } from '../data/aislePreferences';

let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/** Memoize the OPEN PROMISE, not the handle: hydrate fires several queries
 *  concurrently (Promise.all), and two racing first opens are themselves the
 *  Android fresh-install "path already points to a non-normal file" failure
 *  — every caller must await the same open. */
function getDb(): Promise<SQLite.SQLiteDatabase> {
  _dbPromise ??= openDb().catch((err) => {
    _dbPromise = null; // next caller retries a failed open from scratch
    throw err;
  });
  return _dbPromise;
}

/**
 * The connection comes from the shell's storage/kv.ts — the app's ONE database
 * connection — never from a second openDatabaseAsync here. This module used to
 * open its own handle, with a settle-and-retry to survive a fresh-install race
 * against expo-sqlite's ensureDatabasePathExists ("path already points to a
 * non-normal file"). That race was two connections to the same file — this
 * one and storage/kv.ts's — opening in the same tick (hydrate + a settings
 * read land together at cold start); the retry was papering over it, not
 * fixing it. Routing through the shared connection removes the second opener
 * entirely, so the race — and the retry that worked around it — no longer
 * applies (packing-list fixed the identical shape 2026-08-01: ~2-in-15 cold
 * launches raced and the loser's hydration failed open to an empty list).
 */
async function openDb(): Promise<SQLite.SQLiteDatabase> {
  const _db = await getSharedDb();
  await _db.execAsync(`
    CREATE TABLE IF NOT EXISTS lists (
      id            TEXT PRIMARY KEY NOT NULL,
      name          TEXT NOT NULL,
      nameUpdatedAt INTEGER,
      items         TEXT NOT NULL,
      categoryOrder TEXT NOT NULL,
      aislePreferences TEXT,
      shareIdentity TEXT,
      createdAt     INTEGER NOT NULL,
      updatedAt     INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS tombstones (
      id        TEXT PRIMARY KEY NOT NULL,
      deletedAt INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sync_meta (
      k TEXT PRIMARY KEY NOT NULL,
      v TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_settings (
      k TEXT PRIMARY KEY NOT NULL,
      v TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS item_history (
      name     TEXT PRIMARY KEY NOT NULL,
      count    INTEGER NOT NULL,
      lastUsed INTEGER NOT NULL
    );
  `);
  // Migration: `nameUpdatedAt` (the name's own merge clock) was added after
  // first release. Old installs have the column missing; add it. Existing
  // rows stay NULL → rowToList falls back to createdAt.
  const cols = await _db.getAllAsync<{ name: string }>(
    'PRAGMA table_info(lists)'
  );
  if (!cols.some((c) => c.name === 'nameUpdatedAt')) {
    try {
      await _db.execAsync('ALTER TABLE lists ADD COLUMN nameUpdatedAt INTEGER');
    } catch (err) {
      // Another connection (a second app instance, a restored background task)
      // may have added the column between the PRAGMA above and here. Losing
      // that race is fine — the column exists either way, and throwing would
      // fail hydration and show an upgrading user an empty list. Anything else
      // is a real error and still propagates.
      if (!/duplicate column name/i.test(String(err))) throw err;
    }
  }
  if (!cols.some(c => c.name === 'aislePreferences')) {
    try { await _db.execAsync('ALTER TABLE lists ADD COLUMN aislePreferences TEXT'); }
    catch (err) { if (!/duplicate column name/i.test(String(err))) throw err; }
  }
  // One transaction owns the destructive, explicitly requested shopping reset.
  // Settings unrelated to shopping (appearance/language) remain untouched.
  await _db.execAsync('BEGIN IMMEDIATE');
  try {
    await _db.execAsync('DROP TABLE IF EXISTS kits');
    const done = await _db.getFirstAsync<{ v: string }>(
      "SELECT v FROM app_settings WHERE k = 'single-list-v1'"
    );
    if (!done) {
      await _db.execAsync("DELETE FROM lists; DELETE FROM item_history; DELETE FROM tombstones; DELETE FROM sync_meta; DELETE FROM app_settings WHERE k IN ('staples', 'pending-join');");
      await insertList(_db, makeList());
      await _db.runAsync("INSERT INTO app_settings (k,v) VALUES ('single-list-v1','1')");
    }
    await _db.execAsync('COMMIT');
  } catch (err) {
    await _db.execAsync('ROLLBACK');
    throw err;
  }
  return _db;
}

export interface HistoryRow {
  name: string;
  count: number;
  lastUsed: number;
}

export async function loadHistory(): Promise<HistoryRow[]> {
  const db = await getDb();
  return db.getAllAsync<HistoryRow>(
    'SELECT name, count, lastUsed FROM item_history ORDER BY count DESC, lastUsed DESC'
  );
}

export async function recordHistory(name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO item_history (name, count, lastUsed) VALUES (?, 1, ?)
     ON CONFLICT(name) DO UPDATE SET count = count + 1, lastUsed = excluded.lastUsed`,
    [name, Date.now()]
  );
}

/** Permanently forget a single autocomplete entry (case-insensitive) — the
 *  swipe-to-delete on a Recent row. Re-typing the word re-adds it from scratch. */
export async function deleteHistory(name: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM item_history WHERE name = ? COLLATE NOCASE',
    [name]
  );
}

/** Re-insert a forgotten row verbatim (Undo) — restores its exact count and
 *  lastUsed so its ranking is unchanged, not reset to a fresh single use. */
export async function putHistory(row: HistoryRow): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO item_history (name, count, lastUsed) VALUES (?, ?, ?)`,
    [row.name, row.count, row.lastUsed]
  );
}

interface ListRow {
  id: string;
  name: string;
  nameUpdatedAt: number | null;
  items: string;
  categoryOrder: string;
  aislePreferences?: string | null;
  shareIdentity: string | null;
  createdAt: number;
  updatedAt: number;
}

/** The placeholder name `joinShared` minted before the name carried its own
 *  clock. A legacy row matching it is an un-renamed joined list, so its name
 *  must lose the merge (clock 0) — otherwise its later createdAt would let the
 *  placeholder overwrite the creator's real name, the very bug this fixes. */
const LEGACY_JOIN_PLACEHOLDER = 'Shared list';

function rowToList(row: ListRow): GroceryList {
  // Pre-migration rows have no name clock. A real list's name was set at
  // creation (→ createdAt); an un-renamed joined placeholder never had a
  // user-chosen name (→ 0, so any real name beats it).
  const nameUpdatedAt =
    row.nameUpdatedAt ??
    (row.shareIdentity != null && row.name === LEGACY_JOIN_PLACEHOLDER
      ? 0
      : row.createdAt);
  return {
    id: row.id,
    name: row.name,
    nameUpdatedAt,
    items: JSON.parse(row.items) as GroceryItem[],
    categoryOrder: JSON.parse(row.categoryOrder) as Category[],
    aislePreferences: sanitizePreferences(row.aislePreferences ? JSON.parse(row.aislePreferences) : []),
    shareIdentity: row.shareIdentity
      ? (JSON.parse(row.shareIdentity) as ShareIdentity)
      : undefined,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function loadAllLists(): Promise<GroceryList[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ListRow>(
    'SELECT * FROM lists ORDER BY updatedAt DESC'
  );
  return rows.map(rowToList);
}

async function insertList(db: SQLite.SQLiteDatabase, list: GroceryList): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO lists
       (id, name, nameUpdatedAt, items, categoryOrder, shareIdentity, createdAt, updatedAt, aislePreferences)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      list.id,
      list.name,
      list.nameUpdatedAt,
      JSON.stringify(list.items),
      JSON.stringify(list.categoryOrder),
      list.shareIdentity ? JSON.stringify(list.shareIdentity) : null,
      list.createdAt,
      list.updatedAt,
      JSON.stringify(list.aislePreferences ?? []),
    ]
  );
}

// Serialize saves and identity replacement. A delayed save of an old local ID
// can never recreate it after the atomic replacement has committed.
let writes: Promise<unknown> = Promise.resolve();
function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const result = writes.then(work);
  writes = result.catch(() => {});
  return result;
}
export function saveList(list: GroceryList): Promise<void> {
  return enqueue(async () => {
    const db = await getDb();
    const current = await db.getFirstAsync<{ id: string }>('SELECT id FROM lists');
    if (current?.id === list.id) await insertList(db, list);
  });
}
export function replaceCurrentList(list: GroceryList, pending: boolean): Promise<void> {
  return enqueue(async () => {
    const db = await getDb();
    await db.execAsync('BEGIN IMMEDIATE');
    try {
      await db.execAsync('DELETE FROM lists');
      await insertList(db, list);
      await db.runAsync("INSERT OR REPLACE INTO app_settings (k,v) VALUES ('pending-join',?)", [pending ? list.id : '']);
      await db.execAsync('COMMIT');
    } catch (err) {
      await db.execAsync('ROLLBACK');
      throw err;
    }
  });
}

export async function getSyncMeta(k: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ v: string }>(
    'SELECT v FROM sync_meta WHERE k = ?',
    [k]
  );
  return row?.v ?? null;
}

export async function setSyncMeta(k: string, v: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT OR REPLACE INTO sync_meta (k, v) VALUES (?, ?)',
    [k, v]
  );
}

// ---------- App settings (account-level prefs) ----------

export async function getAppSetting(k: string): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ v: string }>(
    'SELECT v FROM app_settings WHERE k = ?',
    [k]
  );
  return row?.v ?? null;
}
