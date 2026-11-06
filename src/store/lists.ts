/**
 * Lists store — Zustand state with disk-backed persistence.
 *
 * React state updates synchronously (UI feels instant); the SQLite save runs
 * fire-and-forget in the background. The store is the single source of truth
 * in memory; db.ts is durable backup + (build step 4) the sync substrate.
 *
 * Item deletes remain tombstones for compatible cross-device merges.
 * The array contains exactly one list after initialization.
 */

import { assignedCategory, learnedCategory, preferenceKey, sanitizePreferences } from '../data/aislePreferences';
import { create } from 'zustand';
import {
  type GroceryItem,
  type GroceryList,
  clampQty,
  findActiveByName,
  healFutureStamps,
  makeItem,
  makeList,
  pruneTombstones,
} from '../data/list';
import { DEFAULT_CATEGORY_ORDER, isBuiltinCategory, type Category } from '../data/categories';
import { makeId } from '../lib/id';
import { makeShareIdentity, isShareSecret } from '../sync/share';
import { mergeList } from '../sync/merge';
import {
  now as clockNow,
  initClock,
  observe as observeClock,
  peek as clockPeek,
  MAX_SKEW_MS,
} from '../sync/clock';
import {
  loadAllLists,
  saveList,
  replaceCurrentList,
  getAppSetting,
  getSyncMeta,
  setSyncMeta,
} from './db';
import { isListSnapshot } from '../sync/validateList';
import { logEvent, logError } from '../feedback/log';

/** Heal duplicate ids in loaded data (legacy/edge collisions corrupt React
 *  keys and would let two devices share an id once sync lands). */
function repairIds(lists: GroceryList[]): {
  lists: GroceryList[];
  changed: GroceryList[];
} {
  const seenList = new Set<string>();
  const changed: GroceryList[] = [];
  const out = lists.map((l) => {
    let mutated = false;
    let listId = l.id;
    if (seenList.has(listId)) {
      listId = makeId('l');
      mutated = true;
    }
    seenList.add(listId);

    const seenItem = new Set<string>();
    const items = l.items.map((it) => {
      let id = it.id;
      if (seenItem.has(id)) {
        id = makeId('i');
        mutated = true;
      }
      seenItem.add(id);
      return id === it.id ? it : { ...it, id };
    });

    if (mutated) {
      const repaired: GroceryList = { ...l, id: listId, items };
      changed.push(repaired);
      return repaired;
    }
    return l;
  });
  return { lists: out, changed };
}

interface ListsState {
  lists: GroceryList[];
  hydrated: boolean;
  pendingJoin: boolean;
  transitioning: boolean;

  hydrate: () => Promise<void>;

  getList: (id: string) => GroceryList | undefined;
  /** Add an item or re-add its existing row. Learned list preferences override
   * supplied catalog aisles. The locale argument remains for callers;
   * classification itself is independent of the interface language. */
  addItem: (
    listId: string,
    name: string,
    locale?: string,
    category?: Category
  ) => void;
  setChecked: (listId: string, itemId: string, checked: boolean) => void;
  setQuantity: (listId: string, itemId: string, qty: number) => void;
  setNote: (listId: string, itemId: string, note: string) => void;
  /** Rename an item. An empty/whitespace name is ignored (the previous name
   *  stands) so clearing the field mid-edit can never wipe the row. */
  setName: (listId: string, itemId: string, name: string) => void;
  recategorize: (listId: string, itemId: string, category: Category) => void;
  /** Replace this list's aisle order (build step 3, user-reorderable). */
  reorderAisles: (listId: string, order: Category[]) => void;
  /** Create a custom aisle on this list (deduped case-insensitively against
   *  existing aisles). Returns the resolved aisle key, or null if the name was
   *  empty or the list is gone. */
  addCategory: (listId: string, name: string) => string | null;
  /** Rename a custom aisle in place, including its items and live preferences.
   *  Returns false for missing aisles, empty names, or name collisions. */
  renameCategory: (listId: string, category: string, name: string) => boolean;
  /** Remove a custom aisle and its learned rules, then classify its remaining
   *  items again. Built-in aisles can't be removed. */
  removeCategory: (listId: string, category: string) => void;
  /** Soft-delete (tombstone) an item. */
  deleteItem: (listId: string, itemId: string) => void;

  /** Tombstone every checked item (what you've crossed off); returns their
   *  pre-change snapshots so the caller can offer Undo. This is the "tidy away
   *  what you bought" primitive — invoked from ambient Clear affordances, not a
   *  moment-in-time "finish shop" gate (that ceremony was removed 2026-07-15). */
  clearChecked: (listId: string) => GroceryItem[];
  /** Undo primitive: write the given item snapshots back verbatim (clears a
   *  tombstone, restores checked state). Used by delete + clear-checked undo. */
  restoreItems: (listId: string, items: GroceryItem[]) => void;

  /** Mint (or return the existing) share secret for a list. Stopping sharing keeps a private copy; starting again mints a new secret. */
  shareList: (listId: string) => Promise<string | null>;
  /** Create a local list paired to an existing shared secret (tapped link /
   *  scanned QR). Idempotent: re-joining the same secret returns the list
   *  already paired to it. Returns the local list id. */
  joinShared: (secret: string) => Promise<string>;
  stopSharing: () => Promise<void>;
  /** Merge an incoming remote copy, matched by shared secret (NOT id —
   *  devices have independent local ids). Conflict-free per merge.ts. */
  mergeRemoteList: (remote: GroceryList) => boolean | Promise<boolean>;

  flushPending: () => Promise<void>;
}

function persist(list: GroceryList): void {
  saveList(list).catch((err) => {
    // "My edit didn't stick" reads as an app bug and is almost always a failed
    // write. Structured here (id + item count, never the contents) so the
    // report says which list and how big, not just that something went wrong.
    logError('lists', err, { during: 'persist', items: list.items.length });
    console.warn('grocery-list: failed to persist list', err);
  });
}

export const useListsStore = create<ListsState>()((set, get) => {
  /** Map one list by id through `fn`, bump its updatedAt, persist. */
  function mutate(id: string, fn: (l: GroceryList) => GroceryList): void {
    if (get().pendingJoin || get().transitioning) return;
    let updated: GroceryList | undefined;
    set((s) => ({
      lists: s.lists.map((l) => {
        if (l.id !== id) return l;
        updated = { ...fn(l), updatedAt: clockNow() };
        return updated;
      }),
    }));
    if (updated) persist(updated);
  }

  /** Map one item within a list, stamping item + list updatedAt.
   *  `stampContent:false` leaves the item's content clock alone — a check /
   *  uncheck stamps only its own clock (`checkedUpdatedAt`), because bumping
   *  `updatedAt` would let a check-off clobber a partner's concurrent
   *  rename/quantity edit in the content merge. */
  function mutateItem(
    listId: string,
    itemId: string,
    fn: (it: GroceryItem) => GroceryItem,
    stampContent = true
  ): void {
    mutate(listId, (l) => ({
      ...l,
      items: l.items.map((it) =>
        it.id === itemId
          ? stampContent
            ? { ...fn(it), updatedAt: clockNow() }
            : fn(it)
          : it
      ),
    }));
  }

  return {
    lists: [],
    hydrated: false,
    pendingJoin: false,
    transitioning: false,

    hydrate: async () => {
      const persistClock = (v: number) => {
        setSyncMeta('clock', String(v)).catch(() => {});
      };
      try {
        const [persistedClock, loaded, pendingId] = await Promise.all([
          getSyncMeta('clock'),
          loadAllLists(),
          getAppSetting('pending-join'),
        ]);
        // Hygiene before anything reads the data: clamp far-future stamps
        // (poison left by the pre-logical-clock skew era — they'd keep beating
        // fresh edits until real time caught up) and prune old tombstones (an
        // unpruned list grows until public relays reject its published state).
        if (loaded.length !== 1) throw new Error('Expected exactly one shopping list');
        const phys = Date.now();
        const healed = loaded.map((l) =>
          pruneTombstones(healFutureStamps(l, phys + MAX_SKEW_MS), phys)
        );
        const hygieneChanged = healed.filter((l, i) => l !== loaded[i]);

        // Initialise the skew-resistant clock above both the persisted
        // high-water mark and anything already on disk, so a post-update /
        // post-restore install never stamps an edit below its own stored data
        // (which would let stale local state lose to — or beat — a peer wrongly).
        let maxTs = persistedClock ? Number(persistedClock) || 0 : 0;
        for (const l of healed) {
          maxTs = Math.max(maxTs, l.updatedAt, l.nameUpdatedAt);
          for (const p of l.aislePreferences ?? []) maxTs = Math.max(maxTs, p.updatedAt, p.deletedAt ?? 0);
          for (const it of l.items) {
            maxTs = Math.max(
              maxTs,
              it.updatedAt,
              it.checkedUpdatedAt ?? 0,
              it.deletedAt ?? 0
            );
          }
        }
        initClock(maxTs, persistClock);

        const { lists, changed } = repairIds(healed);
        // The counts that answer "I opened it and my lists were gone": how many
        // came off disk, how many were shared, how many needed repair.
        logEvent('lists', 'hydrated', {
          lists: lists.length,
          shared: lists.filter((l) => !!l.shareIdentity).length,
          healed: hygieneChanged.length,
          repaired: changed.length,
        });
        set({ lists, hydrated: true, pendingJoin: pendingId === lists[0].id, transitioning: false });
        const dirty = new Set([...hygieneChanged, ...changed].map((l) => l.id));
        for (const l of lists) if (dirty.has(l.id)) persist(l);
      } catch (err) {
        // The worst outcome in the app: the user is now looking at an empty
        // home screen with all their lists still on disk.
        logError('lists', err, { during: 'hydrate' });
        console.warn('grocery-list: failed to load lists from disk', err);
        throw err;
      }
    },

    getList: (id) => get().lists.find(l => l.id === id),

    addItem: (listId, name, locale = 'en', category) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const list = get().lists.find((l) => l.id === listId);
      if (!list) return;
      const learned = learnedCategory(list, trimmed);
      const existing = findActiveByName(list, trimmed);
      if (existing) {
        if (existing.checked) {
          // Re-adding a crossed-off item means you want it again NEXT shop —
          // a fresh single need, not "one more than last time". Quantity
          // resets to 1 (bumping it was the reported "shows two" defect).
          mutateItem(listId, existing.id, (it) => ({
            ...it,
            category: learned ?? it.category,
            quantity: 1,
            checked: false,
            checkedAt: undefined,
            checkedUpdatedAt: clockNow(),
          }));
        } else {
          // Already on the list and still wanted: you're asking for another.
          mutateItem(listId, existing.id, (it) => ({
            ...it,
            category: learned ?? it.category,
            quantity: clampQty(it.quantity + 1),
          }));
        }
        return;
      }
      mutate(listId, (l) => ({
        ...l,
        items: [...l.items, makeItem(trimmed, locale, assignedCategory(l, trimmed, category))],
      }));
    },

    setChecked: (listId, itemId, checked) => {
      const at = clockNow();
      mutateItem(
        listId,
        itemId,
        (it) => ({
          ...it,
          checked,
          checkedAt: checked ? at : undefined,
          checkedUpdatedAt: at,
        }),
        false // check state rides its own clock, not the content clock
      );
    },

    setQuantity: (listId, itemId, qty) => {
      mutateItem(listId, itemId, (it) => ({ ...it, quantity: clampQty(qty) }));
    },

    setNote: (listId, itemId, note) => {
      const n = note.trim();
      mutateItem(listId, itemId, (it) => ({
        ...it,
        note: n.length ? n : undefined,
      }));
    },

    setName: (listId, itemId, name) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      mutateItem(listId, itemId, (it) => ({ ...it, name: trimmed }));
    },

    recategorize: (listId, itemId, category) => {
      const list = get().getList(listId);
      const item = list?.items.find(it => it.id === itemId && it.deletedAt == null);
      if (!list || !item || !list.categoryOrder.includes(category)) return;
      const at = clockNow();
      const id = preferenceKey(item.name);
      mutate(listId, l => ({ ...l,
        items: l.items.map(it => it.id === itemId ? { ...it, category, updatedAt: at } : it),
        aislePreferences: sanitizePreferences([
          ...(l.aislePreferences ?? []).filter(p => p.id !== id),
          { id, category, updatedAt: at },
        ]),
      }));
    },

    reorderAisles: (listId, order) => {
      mutate(listId, (l) => ({ ...l, categoryOrder: order }));
    },

    addCategory: (listId, name) => {
      const trimmed = name.trim().slice(0, 40);
      if (!trimmed) return null;
      const list = get().lists.find((l) => l.id === listId);
      if (!list) return null;
      // Dedup case-insensitively against existing aisles (built-in or custom).
      const existing = list.categoryOrder.find(
        (cat) => cat.toLowerCase() === trimmed.toLowerCase()
      );
      if (existing) return existing;
      const order = [...list.categoryOrder];
      // Slot a new custom aisle just above 'Other' (the catch-all), else append.
      const otherIdx = order.indexOf('Other');
      if (otherIdx >= 0) order.splice(otherIdx, 0, trimmed);
      else order.push(trimmed);
      mutate(listId, (l) => ({ ...l, categoryOrder: order }));
      return trimmed;
    },

    renameCategory: (listId, category, name) => {
      const trimmed = name.trim().slice(0, 40);
      const list = get().getList(listId);
      if (!trimmed || !list || isBuiltinCategory(category) || !list.categoryOrder.includes(category)) return false;
      const key = trimmed.toLowerCase();
      if (DEFAULT_CATEGORY_ORDER.some(c => c.toLowerCase() === key) ||
          list.categoryOrder.some(c => c !== category && c.toLowerCase() === key)) return false;
      if (trimmed === category) return true;
      const at = clockNow();
      mutate(listId, l => ({
        ...l,
        categoryOrder: l.categoryOrder.map(c => c === category ? trimmed : c),
        items: l.items.map(it => it.deletedAt == null && it.category === category
          ? { ...it, category: trimmed, updatedAt: at } : it),
        aislePreferences: l.aislePreferences?.map(p => p.deletedAt == null && p.category === category
          ? { ...p, category: trimmed, updatedAt: at } : p),
      }));
      return true;
    },

    removeCategory: (listId, category) => {
      // Built-ins are permanent — only user-created aisles can be removed.
      if (isBuiltinCategory(category)) return;
      const at = clockNow();
      mutate(listId, (l) => {
        const remaining = {
          ...l,
          categoryOrder: l.categoryOrder.filter((cat) => cat !== category),
          aislePreferences: l.aislePreferences?.map(p => p.category === category
            ? { ...p, updatedAt: at, deletedAt: at } : p),
        };
        // Resolve against the remaining rules: the deleted aisle must never
        // win inference, and these automatic moves must not teach new rules.
        return {
          ...remaining,
          items: l.items.map(it => it.deletedAt == null && it.category === category
            ? { ...it, category: assignedCategory(remaining, it.name), updatedAt: at }
            : it),
        };
      });
    },

    deleteItem: (listId, itemId) => {
      const at = clockNow();
      // Prune old tombstones whenever new ones are minted.
      mutate(listId, (l) =>
        pruneTombstones(
          {
            ...l,
            items: l.items.map((it) =>
              it.id === itemId ? { ...it, deletedAt: at, updatedAt: at } : it
            ),
          },
          Date.now()
        )
      );
    },

    clearChecked: (listId) => {
      const list = get().lists.find((l) => l.id === listId);
      if (!list) return [];
      const bought = list.items.filter(
        (it) => it.deletedAt == null && it.checked
      );
      if (bought.length === 0) return [];
      const snapshots = bought.map((it) => ({ ...it }));
      const boughtIds = new Set(bought.map((it) => it.id));
      const at = clockNow();
      // Prune in the same motion — clearing checked is where tombstones are
      // minted, so it's also where the dead weight is kept bounded between launches.
      mutate(listId, (l) =>
        pruneTombstones(
          {
            ...l,
            items: l.items.map((it) =>
              boughtIds.has(it.id)
                ? { ...it, deletedAt: at, updatedAt: at }
                : it
            ),
          },
          Date.now()
        )
      );
      return snapshots;
    },

    restoreItems: (listId, items) => {
      if (items.length === 0) return;
      const byId = new Map(items.map((it) => [it.id, it]));
      const at = clockNow();
      // An undo deliberately reinstates the snapshot's checked state too, so
      // both clocks stamp — the restore must win the merge on every device.
      mutate(listId, (l) => ({
        ...l,
        items: l.items.map((it) =>
          byId.has(it.id)
            ? {
                ...byId.get(it.id)!,
                deletedAt: undefined,
                updatedAt: at,
                checkedUpdatedAt: at,
              }
            : it
        ),
      }));
    },

    shareList: async (listId) => {
      const list = get().lists.find((l) => l.id === listId);
      if (!list || get().transitioning || get().pendingJoin) return null;
      if (list.shareIdentity) return list.shareIdentity.secret;
      const identity = makeShareIdentity();
      // The share/join pair is the app's hardest support surface, so both ends
      // leave a mark. The SECRET is never logged — only that sharing began.
      logEvent('share', 'list shared', { items: list.items.length });
      set({ transitioning: true });
      try {
        const shared = { ...list, shareIdentity: identity, updatedAt: clockNow() };
        await replaceCurrentList(shared, false);
        set({ lists: [shared], transitioning: false });
        return identity.secret;
      } catch (err) { set({ transitioning: false }); throw err; }
    },

    joinShared: async (secret) => {
      if (!isShareSecret(secret)) throw new Error('Invalid sharing code');
      const existing = get().lists[0];
      if (existing?.shareIdentity?.secret === secret) return existing.id;
      if (get().transitioning) throw new Error('Sharing change already in progress');
      const list = { ...makeList(), nameUpdatedAt: 0, shareIdentity: { secret, createdAt: clockNow() } };
      set({ transitioning: true }); // disconnect before any disk awaits
      try {
        await replaceCurrentList(list, true);
        set({ lists: [list], pendingJoin: true, transitioning: false });
        return list.id;
      } catch (err) { set({ transitioning: false }); throw err; }
    },

    stopSharing: async () => {
      const current = get().lists[0];
      if (!current?.shareIdentity || get().transitioning) return;
      const list = { ...current, id: makeId('l'), shareIdentity: undefined };
      set({ transitioning: true });
      try {
        await replaceCurrentList(list, false);
        set({ lists: [list], pendingJoin: false, transitioning: false });
      } catch (err) { set({ transitioning: false }); throw err; }
    },

    mergeRemoteList: (remote) => {
      const secret = remote.shareIdentity?.secret;
      if (!secret || get().transitioning || !isListSnapshot(remote, secret)) return false;
      const local = get().lists.find(
        (l) => l.shareIdentity?.secret === secret
      );
      if (!local) return false;
      // Heal the INCOMING copy too (hydrate only heals what's on disk): a
      // peer still running the pre-clock build republishes far-future
      // poisoned stamps on every sync, which would otherwise out-clock every
      // fresh local edit and undo the hydrate heal seconds after each launch.
      // The receive boundary is side-effect territory, so the merge itself
      // stays a pure function.
      const healed = healFutureStamps({ ...remote, nameUpdatedAt: remote.nameUpdatedAt ?? remote.createdAt, aislePreferences: sanitizePreferences(remote.aislePreferences) }, Date.now() + MAX_SKEW_MS);
      // Advance our clock past every timestamp in the incoming copy, so our
      // NEXT local edit out-clocks whatever the peer last did — this is what
      // turns "fastest wall clock wins" into "last action in causal order wins".
      // The check clock is scanned explicitly: it does NOT ride updatedAt, and
      // relying on the list-level stamp to transitively cover it would be an
      // unwritten invariant.
      let remoteMax = Math.max(healed.updatedAt, healed.nameUpdatedAt);
      for (const p of healed.aislePreferences ?? []) remoteMax = Math.max(remoteMax, p.updatedAt, p.deletedAt ?? 0);
      for (const it of healed.items) {
        remoteMax = Math.max(
          remoteMax,
          it.updatedAt,
          it.checkedUpdatedAt ?? 0,
          it.checkedAt ?? 0,
          it.deletedAt ?? 0
        );
      }
      observeClock(remoteMax);
      if (get().pendingJoin) {
        const adopted = { ...healed, id: local.id, shareIdentity: local.shareIdentity };
        // Keep the pending gate closed until the snapshot is durable. Other
        // snapshots queue in SQLite; only the still-current pending ID may adopt.
        set({ transitioning: true });
        return replaceCurrentList(adopted, false).then(() => {
          set({ lists: [adopted], pendingJoin: false, transitioning: false });
          return true;
        }).catch(err => {
          set({ transitioning: false });
          logError('share', err, { during: 'initial snapshot' });
          return false;
        });
      }
      const merged = mergeList(local, healed);
      // A converged echo (peer answering hello, reconnect force-publish) must
      // not cost a store update + full-list SQLite write + re-render.
      if (JSON.stringify(merged) === JSON.stringify(local)) return true;
      set((s) => ({
        lists: s.lists.map((l) => (l.id === local.id ? merged : l)),
      }));
      persist(merged);
      return true;
    },

    flushPending: async () => {
      if (get().pendingJoin || get().transitioning) return;
      const lists = get().lists;
      await Promise.all(lists.map((l) => saveList(l).catch(() => {})));
      try {
        await setSyncMeta('clock', String(clockPeek()));
      } catch {
        /* best-effort */
      }
    },
  };
});
