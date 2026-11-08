// Exercise the actual SQL and migration against SQLite, with only Expo's
// native connection adapter replaced. Never opens the user's app database.
let mockSqlite: any;
jest.mock('../../storage/kv', () => ({ getDb: async () => ({
  execAsync: async (sql: string) => mockSqlite.exec(sql),
  getAllAsync: async (sql: string, args: unknown[] = []) => mockSqlite.prepare(sql).all(...args),
  getFirstAsync: async (sql: string, args: unknown[] = []) => mockSqlite.prepare(sql).get(...args),
  runAsync: async (sql: string, args: unknown[] = []) => mockSqlite.prepare(sql).run(...args),
}) }));

test('round-trips aisle preferences and tombstones after the one-time reset', async () => {
  const { DatabaseSync } = require('node:sqlite');
  mockSqlite = new DatabaseSync(':memory:');
  try {
    mockSqlite.exec(`CREATE TABLE lists (
      id TEXT PRIMARY KEY, name TEXT, items TEXT, categoryOrder TEXT,
      shareIdentity TEXT, createdAt INTEGER, updatedAt INTEGER
    ); INSERT INTO lists VALUES ('legacy','Old list','[]','["Other"]',NULL,1,2);`);
    await jest.isolateModulesAsync(async () => {
      const db = require('../db');
      const [legacy] = await db.loadAllLists();
      expect(legacy.id).not.toBe('legacy');
      expect(legacy.aislePreferences).toEqual([]);
      await db.saveList({...legacy, categoryOrderUpdatedAt: 5, aislePreferences:[
        {id:'name:my food',category:'Other',updatedAt:3},
        {id:'product:lod:MELLECH1UNI1',category:'Gone',updatedAt:4,deletedAt:4},
      ]});
    });
    await jest.isolateModulesAsync(async () => {
      const [loaded] = await require('../db').loadAllLists();
      expect(loaded.aislePreferences).toHaveLength(2);
      expect(loaded.aislePreferences[1]).toMatchObject({deletedAt:4});
      expect(loaded.items).toEqual([]);
      expect(loaded.categoryOrderUpdatedAt).toBe(5);
      const columns = mockSqlite.prepare('PRAGMA table_info(lists)').all();
      expect(columns.filter((c: any) => c.name === 'aislePreferences')).toHaveLength(1);
      expect(columns.filter((c: any) => c.name === 'categoryOrderUpdatedAt')).toHaveLength(1);
    });
  } finally { mockSqlite.close(); }
});

test('adding the aisle clock column preserves an already initialized household list', async () => {
  mockSqlite = new (require('node:sqlite').DatabaseSync)(':memory:');
  try {
    mockSqlite.exec(`CREATE TABLE lists (
      id TEXT PRIMARY KEY, name TEXT, items TEXT, categoryOrder TEXT,
      shareIdentity TEXT, createdAt INTEGER, updatedAt INTEGER
    ); INSERT INTO lists VALUES ('keep','Groceries','[]','["Custom","Other"]',NULL,1,2);
    CREATE TABLE app_settings (k TEXT PRIMARY KEY, v TEXT);
    INSERT INTO app_settings VALUES ('luxembourgish-shopping-v1','1');`);
    await jest.isolateModulesAsync(async () => {
      const db = require('../db');
      const [loaded] = await db.loadAllLists();
      expect(loaded).toMatchObject({ id: 'keep', categoryOrder: ['Custom', 'Other'], updatedAt: 2 });
      expect(loaded.categoryOrderUpdatedAt).toBeUndefined();
      await db.saveList({ ...loaded, categoryOrderUpdatedAt: loaded.updatedAt });
    });
    await jest.isolateModulesAsync(async () => {
      const [loaded] = await require('../db').loadAllLists();
      expect(loaded).toMatchObject({ id: 'keep', categoryOrder: ['Custom', 'Other'], categoryOrderUpdatedAt: 2 });
    });
  } finally { mockSqlite.close(); }
});
