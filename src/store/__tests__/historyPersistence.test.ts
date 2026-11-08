const { DatabaseSync } = require('node:sqlite');
let mockSqlite: any;
let mockFailWrite = false;
jest.mock('../../storage/kv', () => ({ getDb: async () => ({
  execAsync: async (sql: string) => mockSqlite.exec(sql),
  getAllAsync: async (sql: string, args: unknown[] = []) => mockSqlite.prepare(sql).all(...args),
  getFirstAsync: async (sql: string, args: unknown[] = []) => mockSqlite.prepare(sql).get(...args),
  runAsync: async (sql: string, args: unknown[] = []) => {
    if (mockFailWrite && sql.startsWith('INSERT OR REPLACE INTO item_history')) throw new Error('disk full');
    return mockSqlite.prepare(sql).run(...args);
  },
}) }));

beforeEach(() => { mockSqlite = new DatabaseSync(':memory:'); mockFailWrite = false; });
afterEach(() => mockSqlite.close());
async function session(check: (db: typeof import('../db'), account: typeof import('../account').useAccountStore) => Promise<void>) {
  await jest.isolateModulesAsync(async () => {
    const db = require('../db');
    const account = require('../account').useAccountStore;
    await account.getState().hydrate();
    await check(db, account);
  });
}

test('case and composed/decomposed Unicode share one persisted identity; forget and Undo survive restart', async () => {
  await session(async (db, account) => {
    account.getState().recordUse('Äppeljus bio');
    account.getState().recordUse('äppeljus bio');
    account.getState().recordUse('A\u0308ppeljus bio');
    expect(account.getState().history).toHaveLength(1);
    expect(await db.loadHistory()).toEqual(account.getState().history);
    expect(account.getState().history[0]).toMatchObject({ name: 'Äppeljus bio', count: 3 });
    const removed = account.getState().forgetUse('a\u0308ppeljus bio')!;
    await account.getState().hydrate();
    expect(account.getState().history).toEqual([]);
    account.getState().restoreUse(removed);
    await account.getState().hydrate();
    expect(account.getState().history).toEqual([removed]);
  });
  await session(async (_db, account) => {
    expect(account.getState().history).toEqual([expect.objectContaining({ name: 'Äppeljus bio', count: 3 })]);
  });
});

test('repairs existing duplicates without resetting history, counts, or list data', async () => {
  await session(async db => {
    const [list] = await db.loadAllLists();
    await db.saveList({ ...list, name: 'Retain me' });
    mockSqlite.exec(`INSERT INTO item_history VALUES ('Äppeljus bio', 2, 100), ('äppeljus bio', 3, 200), ('Unrelated', 4, 50)`);
  });
  await session(async (db, account) => {
    expect(account.getState().history).toEqual([
      { name: 'äppeljus bio', count: 5, lastUsed: 200 }, { name: 'Unrelated', count: 4, lastUsed: 50 },
    ]);
    expect((await db.loadAllLists())[0].name).toBe('Retain me');
    expect(mockSqlite.prepare('SELECT * FROM item_history').all()).toHaveLength(2);
    account.getState().forgetUse('ÄPPELJUS BIO');
    await account.getState().hydrate();
    expect(account.getState().history).toEqual([{ name: 'Unrelated', count: 4, lastUsed: 50 }]);
  });
});

test('rapid rename, collision merge, record, forget, and Undo persist in user-action order', async () => {
  await session(async (db, account) => {
    const store = account.getState();
    store.recordUse('Äppeljus bio');
    store.recordUse('Orange bio');
    store.renameUse('Äppeljus bio', 'orange bio');
    store.renameUse('Orange bio', 'Final name');
    store.recordUse('FINAL NAME');
    const removed = store.forgetUse('final name')!;
    store.restoreUse(removed);
    expect(await db.loadHistory()).toEqual(account.getState().history);
    expect(account.getState().history).toEqual([expect.objectContaining({ name: 'Final name', count: 3 })]);
    await store.hydrate();
    expect(account.getState().history).toEqual([removed]);
  });
});

test('case-only rename retains count; Undo after re-add does not overwrite newer usage', async () => {
  await session(async (db, account) => {
    const store = account.getState();
    store.recordUse('Äppeljus bio');
    store.recordUse('Äppeljus bio');
    store.renameUse('Äppeljus bio', 'äppeljus bio');
    expect(await db.loadHistory()).toEqual(account.getState().history);
    const removed = store.forgetUse('Äppeljus bio')!;
    store.recordUse('Äppeljus bio');
    store.restoreUse(removed);
    expect(await db.loadHistory()).toEqual(account.getState().history);
    expect(account.getState().history[0].count).toBe(1);
  });
});

test('failed rename rolls back its deletion and subsequent writes still work', async () => {
  await session(async db => {
    await db.recordHistory('Äppeljus bio', 100);
    mockFailWrite = true;
    await expect(db.renameHistory('Äppeljus bio', 'New name')).rejects.toThrow('disk full');
    mockFailWrite = false;
    expect(await db.loadHistory()).toEqual([{ name: 'Äppeljus bio', count: 1, lastUsed: 100 }]);
    await db.renameHistory('Äppeljus bio', 'New name');
    expect(await db.loadHistory()).toEqual([{ name: 'New name', count: 1, lastUsed: 100 }]);
  });
});
