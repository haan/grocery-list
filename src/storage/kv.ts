import * as SQLite from 'expo-sqlite';
import { DB_NAME } from './dbConfig';
import { logEvent, logError } from '../feedback/log';

// Memoize the open PROMISE, not the resolved handle. If two callers race
// getDb() before the first open settles, caching the handle lets both run
// openDatabaseAsync + the schema exec concurrently — a class of bug that has
// cost real upgrade-path hydration failures in app-owned db.ts (racing PRAGMA
// / ADD COLUMN, racing first opens pointing the path at a half-written file).
// Caching the in-flight promise makes every caller await the one open.
let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_dbPromise) return _dbPromise;
  const openedAt = Date.now();
  _dbPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    // A slow or failed open is the single most common cause of "the app opened
    // to an empty list" — the one report that is unanswerable without a trail.
    logEvent('db', 'opened', { ms: Date.now() - openedAt });
    return db;
  })().catch((err) => {
    // Don't cache a rejected open — let the next caller retry a fresh open.
    _dbPromise = null;
    logError('db', err, { during: 'open', ms: Date.now() - openedAt });
    throw err;
  });
  return _dbPromise;
}
