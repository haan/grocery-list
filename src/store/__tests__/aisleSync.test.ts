jest.mock('../db', () => ({
  loadAllLists: jest.fn(async () => []), saveList: jest.fn(async () => {}),
  getAppSetting: jest.fn(async () => null), getSyncMeta: jest.fn(async () => null),
  setSyncMeta: jest.fn(async () => {}), recordHistory: jest.fn(async () => {}),
}));
import { useListsStore } from '../lists';
import { loadAllLists } from '../db';
import { makeList, healFutureStamps, type GroceryList } from '../../data/list';
import { createItemDraft, applyItemDraft } from '../../data/itemDraft';
import { mergeList } from '../../sync/merge';
import { isListSnapshot } from '../../sync/validateList';
import { initClock, MAX_SKEW_MS, _resetForTest } from '../../sync/clock';

const store = () => useListsStore.getState();
const list = () => store().lists[0];
beforeEach(() => {
  _resetForTest();
  initClock(0, () => {});
  useListsStore.setState({ lists: [makeList()], hydrated: true, pendingJoin: false, transitioning: false });
  store().addItem(list().id, 'Test item', 'en', 'Other');
});
afterEach(() => jest.restoreAllMocks());

test.each(['add', 'rename', 'remove', 'reorder'] as const)('%s aisle survives a later offline check and stale replay', action => {
  store().addCategory(list().id, 'Custom');
  store().recategorize(list().id, list().items[0].id, 'Custom');
  const base = list();
  if (action === 'add') {
    store().addCategory(base.id, 'New aisle');
    store().recategorize(base.id, base.items[0].id, 'New aisle');
  } else if (action === 'rename') store().renameCategory(base.id, 'Custom', 'New aisle');
  else if (action === 'remove') store().removeCategory(base.id, 'Custom');
  else store().reorderAisles(base.id, [...base.categoryOrder].reverse());
  const a = list();
  useListsStore.setState({ lists: [base] });
  store().setChecked(base.id, base.items[0].id, true);
  const b = list();
  expect(b.updatedAt).toBeGreaterThan(a.updatedAt);
  for (const merged of [mergeList(a, b), mergeList(b, a)]) {
    expect(merged.categoryOrder).toEqual(a.categoryOrder);
    expect(merged.items[0]).toMatchObject({ category: a.items[0].category, checked: true });
    const draft = createItemDraft(merged, { itemId: merged.items[0].id });
    draft.note = 'Still editable';
    expect(applyItemDraft(merged, draft, () => merged.updatedAt + 1, () => 'unused').result.ok).toBe(true);
    expect(mergeList(merged, base)).toEqual(merged);
    expect(mergeList(merged, merged)).toEqual(merged);
  }
});

test('item additions, detail saves, notes, and deletions preserve the aisle clock', () => {
  const at = list().categoryOrderUpdatedAt;
  store().addItem(list().id, 'Second item');
  const draft = createItemDraft(list(), { itemId: list().items[0].id });
  draft.quantity = '4';
  expect(store().saveItemDraft(draft).ok).toBe(true);
  store().setNote(list().id, list().items[0].id, 'A note');
  store().deleteItem(list().id, list().items[0].id);
  expect(list().categoryOrderUpdatedAt).toBe(at);
});

test('legacy local snapshots get a baseline before an unrelated edit', () => {
  const legacy = { ...list() }; delete legacy.categoryOrderUpdatedAt;
  useListsStore.setState({ lists: [legacy] });
  store().setChecked(legacy.id, legacy.items[0].id, true);
  expect(list().categoryOrderUpdatedAt).toBe(legacy.updatedAt);
  useListsStore.setState({ lists: [legacy] });
  const draft = createItemDraft(legacy, { itemId: legacy.items[0].id });
  draft.note = 'Edit';
  store().saveItemDraft(draft);
  expect(list().categoryOrderUpdatedAt).toBe(legacy.updatedAt);
});

test('legacy peers still exchange aisle edits using their whole-list timestamp', () => {
  const modern = list();
  const legacy = { ...modern, categoryOrder: [...modern.categoryOrder].reverse(), updatedAt: modern.updatedAt + 10 };
  delete legacy.categoryOrderUpdatedAt;
  for (const merged of [mergeList(modern, legacy), mergeList(legacy, modern)]) {
    expect(merged.categoryOrder).toEqual(legacy.categoryOrder);
    expect(merged.categoryOrderUpdatedAt).toBe(legacy.updatedAt);
    // An old merge ignores the new field and uses the existing array/timestamp.
    const oldEcho = { ...merged }; delete oldEcho.categoryOrderUpdatedAt;
    expect(mergeList(merged, oldEcho)).toEqual(merged);
    useListsStore.setState({ lists: [merged] });
    initClock(merged.updatedAt, () => {});
    store().addCategory(merged.id, 'Later modern aisle');
    const updated = list();
    const asLegacy = { ...updated }; delete asLegacy.categoryOrderUpdatedAt;
    expect(mergeList(oldEcho, asLegacy).categoryOrder).toEqual(updated.categoryOrder);
  }
});

test('concurrent aisle edits tie-break deterministically and associate', () => {
  const base = list();
  const a = { ...base, categoryOrder: ['A', 'Other'], categoryOrderUpdatedAt: 100, updatedAt: 400 };
  const b = { ...base, categoryOrder: ['B', 'Other'], categoryOrderUpdatedAt: 200, updatedAt: 300 };
  const c = { ...base, categoryOrder: ['C', 'Other'], categoryOrderUpdatedAt: 200, updatedAt: 200 };
  expect(mergeList(a, b)).toEqual(mergeList(b, a));
  expect(mergeList(b, c)).toEqual(mergeList(c, b));
  expect(mergeList(mergeList(a, b), c)).toEqual(mergeList(a, mergeList(b, c)));
  expect(mergeList(a, b).categoryOrder).toEqual(b.categoryOrder);
});

test('aisle clocks are validated, healed, and observed on receive and hydrate', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.now());
  const secret = 'a'.repeat(64);
  const base = { ...list(), shareIdentity: { secret, createdAt: 1 } };
  for (const bad of [-1, Infinity, NaN, 'bad']) {
    expect(isListSnapshot({ ...base, categoryOrderUpdatedAt: bad }, secret)).toBe(false);
  }
  expect(isListSnapshot(base, secret)).toBe(true);
  const future = { ...base, categoryOrderUpdatedAt: Date.now() + MAX_SKEW_MS * 2 };
  expect(healFutureStamps(future, Date.now()).categoryOrderUpdatedAt).toBe(Date.now());
  useListsStore.setState({ lists: [base] });
  expect(await store().mergeRemoteList(future)).toBe(true);
  const receivedClock = list().categoryOrderUpdatedAt!;
  expect(receivedClock).toBe(Date.now() + MAX_SKEW_MS);
  store().addCategory(base.id, 'After receive');
  expect(list().categoryOrderUpdatedAt).toBeGreaterThan(receivedClock);
  _resetForTest();
  const saved: GroceryList = { ...base, categoryOrderUpdatedAt: Date.now() + 1000 };
  jest.mocked(loadAllLists).mockResolvedValueOnce([saved]);
  await store().hydrate();
  store().addCategory(base.id, 'After restart');
  expect(list().categoryOrderUpdatedAt).toBeGreaterThan(saved.categoryOrderUpdatedAt!);
});
