/** Atomic, versioned shopping reset and single-list replacement against real SQLite. */
const { DatabaseSync } = require('node:sqlite');
let mockSqlite: any;
let mockFailMarker = false;
jest.mock('../../storage/kv', () => ({ getDb: async () => ({
  execAsync: async (sql: string) => mockSqlite.exec(sql),
  getAllAsync: async (sql: string, args: unknown[] = []) => mockSqlite.prepare(sql).all(...args),
  getFirstAsync: async (sql: string, args: unknown[] = []) => mockSqlite.prepare(sql).get(...args),
  runAsync: async (sql: string, args: unknown[] = []) => {
    if (mockFailMarker && sql.includes("VALUES ('single-list-v1'")) throw new Error('disk full');
    return mockSqlite.prepare(sql).run(...args);
  },
}) }));
beforeEach(() => { mockSqlite = new DatabaseSync(':memory:'); mockFailMarker = false; });
afterEach(() => mockSqlite.close());
async function reopen(check: (db: typeof import('../db')) => Promise<void>) {
  await jest.isolateModulesAsync(async () => { await check(require('../db')); });
}
function legacy() {
  mockSqlite.exec(`
    CREATE TABLE lists (id TEXT PRIMARY KEY, name TEXT, items TEXT, categoryOrder TEXT, shareIdentity TEXT, createdAt INTEGER, updatedAt INTEGER);
    INSERT INTO lists VALUES ('old','Old shop','[{"id":"old-item"}]','["Custom aisle"]','{"secret":"old-secret"}',10,20);
    CREATE TABLE kits (id TEXT PRIMARY KEY); INSERT INTO kits VALUES ('retired');
    CREATE TABLE item_history (name TEXT PRIMARY KEY, count INTEGER, lastUsed INTEGER);
    INSERT INTO item_history VALUES ('Mëllech',3,20);
    CREATE TABLE app_settings (k TEXT PRIMARY KEY, v TEXT);
    INSERT INTO app_settings VALUES ('staples','["Mëllech"]'),('theme','dark'),('language','en');
    CREATE TABLE sync_meta (k TEXT PRIMARY KEY, v TEXT); INSERT INTO sync_meta VALUES ('clock','42');
    CREATE TABLE tombstones (id TEXT PRIMARY KEY, deletedAt INTEGER); INSERT INTO tombstones VALUES ('old-list',15);
  `);
}
test.each([false,true])('initializes exactly one empty private list once (upgrade=%s)', async upgrade => {
  if (upgrade) legacy();
  let saved: any;
  await reopen(async db => {
    const lists = await db.loadAllLists();
    expect(lists).toHaveLength(1);
    expect(lists[0]).toMatchObject({ items: [], shareIdentity: undefined });
    expect(lists[0].categoryOrder).toContain('Other');
    expect(lists[0].categoryOrder).not.toContain('Custom aisle');
    expect(await db.loadHistory()).toEqual([]);
    expect(await db.getAppSetting('staples')).toBeNull();
    expect(await db.getSyncMeta('clock')).toBeNull();
    expect(mockSqlite.prepare('SELECT * FROM tombstones').all()).toEqual([]);
    if(upgrade) {
      expect(await db.getAppSetting('theme')).toBe('dark');
      expect(await db.getAppSetting('language')).toBe('en');
    }
    saved = { ...lists[0], name: 'Internal wire name', categoryOrder: ['Produce','Custom','Other'], aislePreferences: [{ id:'name:test',category:'Custom',updatedAt:20 }], shareIdentity:{secret:'saved',createdAt:10} };
    await db.saveList(saved);
    await db.recordHistory('Apel');
  });
  for(let i=0;i<2;i++) await reopen(async db => {
    expect(await db.loadAllLists()).toEqual([saved]);
    expect(await db.loadHistory()).toHaveLength(1);
  });
  expect(mockSqlite.prepare("SELECT name FROM sqlite_master WHERE name='kits'").all()).toEqual([]);
});
test('failed reset rolls back all shopping data and marker; retry succeeds', async () => {
  legacy(); mockFailMarker=true;
  await reopen(async db => {
    await expect(db.loadAllLists()).rejects.toThrow('disk full');
    expect(mockSqlite.prepare('SELECT id FROM lists').get().id).toBe('old');
    expect(mockSqlite.prepare('SELECT * FROM item_history').all()).toHaveLength(1);
    expect(mockSqlite.prepare("SELECT * FROM app_settings WHERE k='single-list-v1'").get()).toBeUndefined();
    expect(mockSqlite.prepare("SELECT v FROM app_settings WHERE k='staples'").get()).toBeTruthy();
    mockFailMarker=false;
    expect((await db.loadAllLists())[0].id).not.toBe('old');
  });
});
test('replacement is atomic, pending state survives restart, stale saves cannot resurrect the old ID', async () => {
  let joined: any;
  await reopen(async db => {
    const [old] = await db.loadAllLists();
    joined={...old,id:'joined',shareIdentity:{secret:'new',createdAt:50}};
    await Promise.all([db.saveList({...old,name:'last edit'}), db.replaceCurrentList(joined,true), db.saveList({...old,name:'late callback'})]);
    expect(await db.loadAllLists()).toEqual([joined]);
    expect(await db.getAppSetting('pending-join')).toBe('joined');
  });
  await reopen(async db => {
    expect(await db.loadAllLists()).toEqual([joined]);
    expect(await db.getAppSetting('pending-join')).toBe('joined');
    await db.replaceCurrentList({...joined,shareIdentity:undefined,id:'private'},false);
    expect(await db.getAppSetting('pending-join')).toBe('');
  });
});
