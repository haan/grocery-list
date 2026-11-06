import { create } from 'zustand';
import {
  loadHistory,
  recordHistory,
  deleteHistory,
  putHistory,
  type HistoryRow,
} from './db';


// Re-exported so existing call sites can keep importing from the store; the
// implementation lives in a dependency-free module for unit-testing.
export { historyScore, rankedHistoryNames } from './historyRank';

interface AccountState {
  hydrated: boolean;
  history: HistoryRow[];

  hydrate: () => Promise<void>;

  /** Record that the user added `name` (bumps autocomplete ranking). */
  recordUse: (name: string) => void;

  /** Permanently forget a Recent suggestion. Returns the removed row so the
   *  caller can offer Undo; undefined if there was nothing to forget. */
  forgetUse: (name: string) => HistoryRow | undefined;
  /** Re-insert a forgotten row verbatim (Undo). */
  restoreUse: (row: HistoryRow) => void;

  /** Rename a Recent suggestion in place, preserving its ranking (count +
   *  lastUsed). If the new name collides with an existing entry the two merge
   *  (counts summed, newest lastUsed kept). No-op if nothing meaningful changed. */
  renameUse: (oldName: string, newName: string) => void;

}

export const useAccountStore = create<AccountState>()((set, get) => ({
  hydrated: false,
  history: [],

  hydrate: async () => {
    try {
      const history = await loadHistory();
      set({ history, hydrated: true });
    } catch (err) {
      console.warn('grocery-list: failed to load account data', err);
      throw err;
    }
  },

  recordUse: (name) => {
    const n = name.trim();
    if (!n) return;
    set((s) => {
      const lower = n.toLowerCase();
      const existing = s.history.find((h) => h.name.toLowerCase() === lower);
      const next: HistoryRow[] = existing
        ? s.history.map((h) =>
            h === existing
              ? { ...h, count: h.count + 1, lastUsed: Date.now() }
              : h
          )
        : [...s.history, { name: n, count: 1, lastUsed: Date.now() }];
      next.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
      return { history: next };
    });
    recordHistory(n).catch((err) =>
      console.warn('grocery-list: failed to record history', err)
    );
  },

  forgetUse: (name) => {
    const lower = name.trim().toLowerCase();
    const removed = get().history.find(
      (h) => h.name.toLowerCase() === lower
    );
    if (!removed) return undefined;
    set((s) => ({
      history: s.history.filter((h) => h.name.toLowerCase() !== lower),
    }));
    deleteHistory(removed.name).catch((err) =>
      console.warn('grocery-list: failed to forget history', err)
    );
    return removed;
  },

  restoreUse: (row) => {
    set((s) => {
      const lower = row.name.toLowerCase();
      if (s.history.some((h) => h.name.toLowerCase() === lower)) return s;
      const next = [...s.history, row];
      next.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
      return { history: next };
    });
    putHistory(row).catch((err) =>
      console.warn('grocery-list: failed to restore history', err)
    );
  },

  renameUse: (oldName, newName) => {
    const next = newName.trim();
    if (!next) return;
    const fromLower = oldName.trim().toLowerCase();
    const toLower = next.toLowerCase();

    const from = get().history.find((h) => h.name.toLowerCase() === fromLower);
    if (!from) return;
    // A pure no-op (same name, same case) — nothing to persist.
    if (from.name === next) return;

    // Merge into any existing entry under the new name (case-insensitive), so a
    // rename onto a word you already buy stacks rather than forking the ranking.
    const collision = get().history.find(
      (h) => h.name.toLowerCase() === toLower && h.name.toLowerCase() !== fromLower
    );
    const merged: HistoryRow = {
      name: next,
      count: from.count + (collision?.count ?? 0),
      lastUsed: Math.max(from.lastUsed, collision?.lastUsed ?? 0),
    };

    set((s) => {
      const kept = s.history.filter(
        (h) =>
          h.name.toLowerCase() !== fromLower && h.name.toLowerCase() !== toLower
      );
      const nextHistory = [...kept, merged];
      nextHistory.sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);
      return { history: nextHistory };
    });

    // Persist: drop both old rows, then write the merged one.
    deleteHistory(from.name)
      .then(() => (collision ? deleteHistory(collision.name) : undefined))
      .then(() => putHistory(merged))
      .catch((err) =>
        console.warn('grocery-list: failed to rename history', err)
      );
  },

}));
