jest.mock('../db', () => ({
  loadAllLists: jest.fn(async () => []), saveList: jest.fn(async () => {}),
  getSyncMeta: jest.fn(async () => null), setSyncMeta: jest.fn(async () => {}),
}));
import { useListsStore } from '../lists';
import { loadAllLists, saveList } from '../db';
import { learnedCategory, preferenceKey, sanitizePreferences } from '../../data/aislePreferences';
import { makeList, healFutureStamps, type GroceryList } from '../../data/list';
import { mergeList } from '../../sync/merge';

const store = () => useListsStore.getState();
const list = (id: string) => store().getList(id)!;
const live = (id: string) => list(id).items.filter(i => i.deletedAt == null);
function correct(id: string, name: string, category = 'Pantry') {
  store().addItem(id, name);
  const item = live(id).find(i => i.name === name)!;
  store().recategorize(id, item.id, category);
  return item.id;
}
beforeEach(() => { useListsStore.setState({ lists: [], hydrated: true }); jest.clearAllMocks(); });

test('manual correction survives delete/re-add, aliases, and catalog-supplied categories', () => {
  const id = store().createList('Test');
  const itemId = correct(id, 'Mëllech');
  store().deleteItem(id, itemId);
  store().addItem(id, 'Mëllech', 'en', 'Dairy & eggs');
  store().addItem(id, 'Milch');
  expect(live(id).map(i => i.category)).toEqual(['Pantry', 'Pantry']);
  expect(list(id).aislePreferences).toHaveLength(1);
});

test('selecting the current aisle teaches; automatic additions do not', () => {
  const id = store().createList();
  store().addItem(id, 'Ee');
  expect(list(id).aislePreferences).toBeUndefined();
  store().recategorize(id, live(id)[0].id, 'Dairy & eggs');
  expect(learnedCategory(list(id), 'Eeër')).toBe('Dairy & eggs');
});

test('full-name corrections override product preferences without spreading to other names', () => {
  const id = store().createList();
  correct(id, 'Mëllech', 'Pantry');
  correct(id, 'Bio Mëllech 1L', 'Beverages');
  expect(learnedCategory(list(id), 'BIO  mellech 1l')).toBe('Beverages');
  expect(learnedCategory(list(id), 'Mëllech 2L')).toBe('Pantry');
  expect(preferenceKey('Bio Mëllech 1L')).toBe('name:bio mellech 1l');
  expect(preferenceKey('Paprika')).toBe('name:paprika');
});

test('personal history names preserve spelling and use the destination list preference', () => {
  const a = store().createList(), b = store().createList();
  correct(a, 'Gromper', 'Pantry');
  store().addItem(a, 'Gromperen');
  store().addItem(b, 'Gromperen');
  expect(live(a)[1]).toMatchObject({ name: 'Gromperen', category: 'Pantry' });
  expect(live(b)[0].category).toBe('Produce');
});

test('re-adding active and checked items applies preferences but preserves categories without one', () => {
  const id = store().createList();
  store().addItem(id, 'Milch');
  correct(id, 'Mëllech', 'Pantry');
  expect(live(id)[0].category).toBe('Dairy & eggs'); // no retrospective reorganization
  store().addItem(id, 'Milch');
  expect(live(id)[0]).toMatchObject({ category: 'Pantry', quantity: 2 });
  store().setChecked(id, live(id)[0].id, true);
  store().addItem(id, 'Milch');
  expect(live(id)[0]).toMatchObject({ category: 'Pantry', quantity: 1, checked: false });
  store().addItem(id, 'my own food', 'en', 'Bakery');
  store().addItem(id, 'my own food', 'en', 'Produce');
  expect(live(id).at(-1)?.category).toBe('Bakery');
});

test('kit additions and revivals honor preferences without learning from kit categories', () => {
  const id = store().createList();
  const itemId = correct(id, 'Mëllech', 'Pantry');
  store().setChecked(id, itemId, true);
  store().addKitItems(id, [
    {name: 'Mëllech', category: 'Dairy & eggs', quantity: 3},
    {name: 'Milch', category: 'Dairy & eggs', quantity: 2},
    {name: 'custom', category: 'Bakery', quantity: 1},
  ]);
  expect(live(id).map(i => i.category)).toEqual(['Pantry', 'Pantry', 'Bakery']);
  expect(list(id).aislePreferences).toHaveLength(1);
});

test('re-adding an already active kit item updates its learned aisle with reversible snapshots', () => {
  const id = store().createList();
  store().addItem(id, 'Milch');
  correct(id, 'Mëllech', 'Pantry');
  const {revived} = store().addKitItems(id, [{name:'Milch',category:'Dairy & eggs',quantity:5}]);
  expect(live(id)[0]).toMatchObject({category:'Pantry',quantity:1,checked:false});
  store().restoreItems(id, revived);
  expect(live(id)[0].category).toBe('Dairy & eggs');
  expect(learnedCategory(list(id),'Milch')).toBe('Pantry');
});

test('receiving an item category edit without a preference never teaches a rule', () => {
  const id = store().createList();
  const secret = store().shareList(id)!;
  store().addItem(id, 'Mëllech');
  const remote = {...list(id), shareIdentity:{secret,createdAt:1},
    items:list(id).items.map(i => ({...i,category:'Pantry',updatedAt:i.updatedAt+1}))};
  store().mergeRemoteList(remote);
  expect(live(id)[0].category).toBe('Pantry');
  expect(learnedCategory(list(id),'Milch')).toBeUndefined();
});

test('creating/reordering aisles does not learn; deleting clears rules and moves items', () => {
  const id = store().createList();
  expect(store().addCategory(id, '  ')).toBeNull();
  expect(store().addCategory(id, ' Local ')).toBe('Local');
  expect(store().addCategory(id, 'local')).toBe('Local');
  expect(list(id).categoryOrder.slice(-2)).toEqual(['Local', 'Other']);
  expect(list(id).aislePreferences).toBeUndefined();
  correct(id, 'Mëllech', 'Local');
  const stale = JSON.parse(JSON.stringify(list(id)));
  store().reorderAisles(id, [...list(id).categoryOrder].reverse());
  expect(learnedCategory(list(id), 'Milch')).toBe('Local');
  store().removeCategory(id, 'Local');
  expect(live(id)[0].category).toBe('Dairy & eggs');
  expect(list(id).aislePreferences![0].deletedAt).toBeDefined();
  expect(learnedCategory(mergeList(list(id), stale), 'Milch')).toBeUndefined();
  store().addCategory(id, 'Local');
  expect(learnedCategory(list(id), 'Milch')).toBeUndefined();
  store().removeCategory(id, 'Produce');
  expect(list(id).categoryOrder).toContain('Produce');
});

test('deleting an aisle reclassifies live items using remaining rules without learning or changing check state', () => {
  const id = store().createList();
  store().addCategory(id, 'Local');
  correct(id, 'Mëllech', 'Pantry');
  const milk = correct(id, 'Bio Mëllech 1L', 'Local');
  const bread = correct(id, 'Brout', 'Local');
  correct(id, 'mystery product', 'Local');
  const deleted = correct(id, 'Apel', 'Local');
  store().deleteItem(id, deleted);
  store().setChecked(id, bread, true);
  store().setQuantity(id, bread, 3);
  store().setNote(id, bread, 'Keep this note');
  const before = JSON.parse(JSON.stringify(list(id)));
  store().removeCategory(id, 'Local');
  const after = list(id);
  expect(after.items.find(i => i.id === milk)?.category).toBe('Pantry');
  expect(after.items.find(i => i.id === bread)).toMatchObject({
    category:'Bakery', checked:true, quantity:3, note:'Keep this note',
    checkedUpdatedAt:before.items.find((i: {id:string}) => i.id === bread).checkedUpdatedAt,
  });
  expect(after.items.find(i => i.name === 'mystery product')?.category).toBe('Other');
  expect(after.items.find(i => i.id === deleted)).toEqual(before.items.find((i: {id:string}) => i.id === deleted));
  expect(after.items.find(i => i.name === 'Mëllech')).toEqual(before.items.find((i: {name:string}) => i.name === 'Mëllech'));
  expect(after.aislePreferences).toHaveLength(before.aislePreferences.length);
  expect(after.aislePreferences!.filter(p => p.deletedAt == null)).toEqual([
    expect.objectContaining({id:preferenceKey('Mëllech'), category:'Pantry'}),
  ]);
  for (const merged of [mergeList(after,before), mergeList(before,after)]) {
    expect(merged.items.find(i => i.id === milk)?.category).toBe('Pantry');
    expect(merged.items.find(i => i.id === bread)?.category).toBe('Bakery');
    expect(merged.categoryOrder).not.toContain('Local');
  }
});

test('preferences persist through hydration and duplicate lists are independent', async () => {
  const id = store().createList();
  correct(id, 'Mëllech');
  const saved = JSON.parse(JSON.stringify(list(id)));
  expect(saveList).toHaveBeenLastCalledWith(list(id));
  jest.mocked(loadAllLists).mockResolvedValueOnce([saved]);
  useListsStore.setState({ lists: [] });
  await store().hydrate();
  expect(learnedCategory(list(id), 'Milch')).toBe('Pantry');
  const copy = store().duplicateList(id)!;
  expect(list(copy).aislePreferences).not.toBe(list(id).aislePreferences);
  correct(copy, 'Milch', 'Beverages');
  expect(learnedCategory(list(id), 'Milch')).toBe('Pantry');
});

test('renaming an aisle preserves its position, items, and alias learning through sync and restart', async () => {
  const id = store().createList();
  store().addCategory(id, 'Local');
  const milk = correct(id, 'Mëllech', 'Local');
  store().setChecked(id, milk, true);
  store().setQuantity(id, milk, 4);
  store().setNote(id, milk, 'Keep this');
  const before = JSON.parse(JSON.stringify(list(id)));
  const index = before.categoryOrder.indexOf('Local');
  expect(store().renameCategory(id, 'Local', '  Chilled  ')).toBe(true);
  const after = list(id);
  expect(after.categoryOrder[index]).toBe('Chilled');
  expect(after.categoryOrder).not.toContain('Local');
  expect(after.items.find(i => i.id === milk)).toMatchObject({
    category:'Chilled', quantity:4, checked:true, note:'Keep this',
    checkedUpdatedAt:before.items[0].checkedUpdatedAt,
  });
  expect(learnedCategory(after, 'Milch')).toBe('Chilled');
  expect(after.aislePreferences).toHaveLength(before.aislePreferences.length);
  for (const merged of [mergeList(after,before), mergeList(before,after)]) {
    expect(merged.categoryOrder[index]).toBe('Chilled');
    expect(merged.items.find(i => i.id === milk)?.category).toBe('Chilled');
    expect(learnedCategory(merged,'Milch')).toBe('Chilled');
  }
  expect(saveList).toHaveBeenLastCalledWith(after);
  jest.mocked(loadAllLists).mockResolvedValueOnce(JSON.parse(JSON.stringify([after])));
  useListsStore.setState({lists:[]});
  await store().hydrate();
  store().addItem(id,'Milch');
  expect(live(id).find(i => i.name === 'Milch')?.category).toBe('Chilled');
});

test('rename validates names, permits case changes, and never revives deleted preferences', () => {
  const id = store().createList();
  store().addCategory(id,'Local');
  store().addCategory(id,'Deli');
  correct(id,'Mëllech','Local');
  const snapshot = list(id);
  for (const name of ['', '   ', 'Deli', 'deli', 'Produce', 'produce']) {
    expect(store().renameCategory(id,'Local',name)).toBe(false);
    expect(list(id)).toBe(snapshot);
  }
  expect(store().renameCategory(id,'Produce','Fruit')).toBe(false);
  expect(store().renameCategory(id,'Missing','New')).toBe(false);
  expect(store().renameCategory('missing','Local','New')).toBe(false);
  expect(store().renameCategory(id,'Local','Local')).toBe(true);
  expect(list(id)).toBe(snapshot);
  expect(store().renameCategory(id,'Local','LOCAL')).toBe(true);
  expect(learnedCategory(list(id),'Milch')).toBe('LOCAL');
  store().removeCategory(id,'LOCAL');
  const tombstone = {...list(id).aislePreferences![0]};
  store().addCategory(id,'LOCAL');
  expect(store().renameCategory(id,'LOCAL','A'.repeat(50))).toBe(true);
  expect(list(id).categoryOrder).toContain('A'.repeat(40));
  expect(list(id).aislePreferences![0]).toEqual(tombstone);
  expect(learnedCategory(list(id),'Milch')).toBeUndefined();
});

function withPrefs(prefs: unknown): GroceryList {
  return { ...makeList('Test'), id: 'shared', createdAt: 1, nameUpdatedAt: 1, updatedAt: 10,
    aislePreferences: sanitizePreferences(prefs) };
}
const milk = preferenceKey('Mëllech'), bread = preferenceKey('Brout');
test('offline unrelated corrections survive; conflicts converge and stale replay is idempotent', () => {
  const a = withPrefs([{id: milk, category: 'Pantry', updatedAt: 20}]);
  const b = withPrefs([{id: bread, category: 'Frozen', updatedAt: 20}]);
  const c = withPrefs([{id: milk, category: 'Beverages', updatedAt: 20}]);
  const ab = mergeList(a,b);
  expect(ab.aislePreferences).toHaveLength(2);
  expect(mergeList(a,b)).toEqual(mergeList(b,a));
  expect(mergeList(mergeList(a,b),c)).toEqual(mergeList(a,mergeList(b,c)));
  expect(mergeList(ab,a)).toEqual(ab);
  expect(mergeList(a,c)).toEqual(mergeList(c,a));
});

test('deletion wins tied clocks; unavailable aisles are ignored; legacy payload preserves new rules', () => {
  const a = withPrefs([{id: milk, category: 'Pantry', updatedAt: 20}]);
  const dead = withPrefs([{id: milk, category: 'Pantry', updatedAt: 20, deletedAt: 20}]);
  expect(learnedCategory(mergeList(a,dead), 'Milch')).toBeUndefined();
  expect(learnedCategory(withPrefs([{id: milk, category: 'Missing', updatedAt: 30}]), 'Milch')).toBeUndefined();
  const legacy = {...a}; delete legacy.aislePreferences;
  expect(mergeList(a, legacy).aislePreferences).toEqual(a.aislePreferences);
});

test('validates and heals remote preference clocks before the next local correction', () => {
  expect(sanitizePreferences([null, {id: 'oops'}, {id: milk, category: 'Pantry', updatedAt: NaN}])).toEqual([]);
  const raw = withPrefs([{id: milk, category: 'Pantry', updatedAt: 999, deletedAt: 1000}]);
  expect(healFutureStamps(raw,100).aislePreferences![0]).toMatchObject({updatedAt:100, deletedAt:100});
  const id = store().createList();
  const secret = store().shareList(id)!;
  const future = Date.now() + 50000;
  const remote = {...list(id), shareIdentity:{secret,createdAt:1}, aislePreferences:[{id:milk,category:'Pantry',updatedAt:future}]};
  store().mergeRemoteList(remote);
  correct(id,'Mëllech','Dairy & eggs');
  expect(list(id).aislePreferences![0].updatedAt).toBeGreaterThan(future);
});
