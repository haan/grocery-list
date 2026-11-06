// Exercise the actual SQL and migration against SQLite, with only Expo's
// native connection adapter replaced. Never opens the user's app database.
let mockSqlite: any;
jest.mock('../../storage/kv', () => ({ getDb: async () => ({
  execAsync: async (sql: string) => mockSqlite.exec(sql),
  getAllAsync: async (sql: string, args: unknown[] = []) => mockSqlite.prepare(sql).all(...args),
  runAsync: async (sql: string, args: unknown[] = []) => mockSqlite.prepare(sql).run(...args),
}) }));

test('migrates a legacy database, retains its items, and round-trips preferences after reopening', async () => {
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
      expect(legacy.name).toBe('Old list');
      expect(legacy.aislePreferences).toEqual([]);
      await db.saveList({...legacy, aislePreferences:[
        {id:'name:my food',category:'Other',updatedAt:3},
        {id:'product:lod:MELLECH1UNI1',category:'Gone',updatedAt:4,deletedAt:4},
      ]});
    });
    await jest.isolateModulesAsync(async () => {
      const [loaded] = await require('../db').loadAllLists();
      expect(loaded.aislePreferences).toHaveLength(2);
      expect(loaded.aislePreferences[1]).toMatchObject({deletedAt:4});
      expect(loaded.items).toEqual([]);
      const columns = mockSqlite.prepare('PRAGMA table_info(lists)').all();
      expect(columns.filter((c: any) => c.name === 'aislePreferences')).toHaveLength(1);
    });
  } finally { mockSqlite.close(); }
});
