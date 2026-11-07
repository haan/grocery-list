jest.mock('../db', () => ({
  saveList: jest.fn(async () => {}), recordHistory: jest.fn(async () => {}),
}));
import { useListsStore } from '../lists';
import { useAccountStore } from '../account';
import { saveList } from '../db';
import { makeList, makeItem } from '../../data/list';
import { createItemDraft, renameDraft, validQuantity, type ItemDraft } from '../../data/itemDraft';
import { learnedCategory, preferenceKey } from '../../data/aislePreferences';
import { mergeList } from '../../sync/merge';

const store = () => useListsStore.getState();
const list = () => store().lists[0];
const draft = (name = 'Plastiktut') => createItemDraft(list(), { name });
const save = (d: ItemDraft) => store().saveItemDraft(d);
beforeEach(() => {
  useListsStore.setState({ lists: [makeList()], hydrated: true, pendingJoin: false, transitioning: false });
  useAccountStore.setState({ history: [], hydrated: true });
  jest.clearAllMocks();
});

test('complete custom item and learning publish and persist as one list update', () => {
  store().addCategory(list().id, 'Bags');
  jest.clearAllMocks();
  const d = { ...draft(), quantity: '6', note: 'Strong bags', category: 'Bags', explicitCategory: true };
  const snapshots: unknown[] = [];
  const unsub = useListsStore.subscribe(s => snapshots.push(s.lists[0]));
  expect(list().items).toEqual([]);
  expect(save(d).ok).toBe(true);
  unsub();
  expect(snapshots).toHaveLength(1);
  expect(saveList).toHaveBeenCalledTimes(1);
  expect(list().items).toEqual([expect.objectContaining({ name: 'Plastiktut', quantity: 6, note: 'Strong bags', category: 'Bags' })]);
  expect(list().categoryOrder.slice(-2)).toEqual(['Bags', 'Other']);
  expect(learnedCategory(list(), 'Plastiktut')).toBe('Bags');
  expect(useAccountStore.getState().history).toEqual([expect.objectContaining({ name: 'Plastiktut', count: 1 })]);
});

test('drafts have no side effects; unknown names start in Other', () => {
  const original = list();
  const d = draft();
  expect(d).toMatchObject({ category: 'Other', quantity: '1', note: '' });
  renameDraft(d, 'Mëllech', list());
  expect(list()).toBe(original);
  expect(saveList).not.toHaveBeenCalled();
  expect(useAccountStore.getState().history).toEqual([]);
});

test.each(['', '0', '100', '-1', '1.5', 'NaN', '1e1', ' 6 '])('invalid quantity %j never saves', quantity => {
  expect(validQuantity(quantity)).toBe(false);
  expect(save({ ...draft(), quantity })).toEqual({ ok: false, error: 'quantity' });
  expect(saveList).not.toHaveBeenCalled();
});
test.each(['1', '6', '99'])('valid whole quantity %s', quantity => expect(validQuantity(quantity)).toBe(true));
test('blank names cannot save', () => expect(save(draft('  '))).toEqual({ ok: false, error: 'name' }));

test('existing unchecked selection edits total quantity and does not increase Recent use', () => {
  save({ ...draft(), quantity: '2' });
  const d = draft('plastiktut');
  expect(d.mode).toBe('edit');
  expect(d.quantity).toBe('2');
  save({ ...d, quantity: '6' });
  expect(list().items).toHaveLength(1);
  expect(list().items[0].quantity).toBe(6);
  expect(useAccountStore.getState().history[0].count).toBe(1);
});

test('re-add resets quantity, retains note, uses learned aisle, and only unchecks on save', () => {
  save({ ...draft('Mëllech'), quantity: '6', note: 'Whole' });
  const item = list().items[0];
  store().setChecked(list().id, item.id, true);
  useListsStore.setState({ lists: [{ ...list(), aislePreferences: [{ id: preferenceKey('Mëllech'), category: 'Pantry', updatedAt: 1 }] }] });
  const d = draft('Mëllech');
  expect(d).toMatchObject({ mode: 'readd', quantity: '1', note: 'Whole', category: 'Pantry' });
  expect(list().items[0].checked).toBe(true);
  save(d);
  expect(list().items[0]).toMatchObject({ checked: false, quantity: 1, note: 'Whole', category: 'Pantry' });
  expect(useAccountStore.getState().history[0].count).toBe(2);
});

test('direct editing preserves checked state and its clock, including legacy items', () => {
  const item = { ...makeItem('Apel'), checked: true, checkedUpdatedAt: undefined };
  useListsStore.setState({ lists: [{ ...list(), items: [item] }] });
  const d = createItemDraft(list(), { itemId: item.id });
  save({ ...d, quantity: '6' });
  expect(list().items[0]).toMatchObject({ checked: true, checkedUpdatedAt: item.updatedAt });
});

test('automatic selection follows names until explicit aisle selection; learning uses final name', () => {
  let d = renameDraft(draft(), 'Mëllech', list());
  expect(d.category).toBe('Dairy & eggs');
  d = renameDraft({ ...d, explicitCategory: true }, 'Gromper', list());
  expect(d.category).toBe('Dairy & eggs');
  save(d);
  expect(learnedCategory(list(), 'Gromperen')).toBe('Dairy & eggs');
  expect(learnedCategory(list(), 'Mëllech')).toBeUndefined();
});

test('automatic assignments never teach; selecting the current aisle does', () => {
  save(draft('Apel'));
  expect(list().aislePreferences).toBeUndefined();
  save({ ...draft('Apel'), explicitCategory: true });
  expect(learnedCategory(list(), 'Apel')).toBe('Produce');
});

test('undoing a name edit restores the original suggested aisle', () => {
  save({ ...draft('Plastiktut'), category: 'Household', explicitCategory: true });
  const d = draft('Plastiktut');
  const renamed = renameDraft(d, 'Mëllech', list());
  expect(renamed.category).toBe('Dairy & eggs');
  const restored = renameDraft(renamed, 'Plastiktut', list());
  expect(restored.category).toBe('Household');
  save(restored);
  expect(list().items[0].category).toBe('Household');
});

test('complete details and learned assignments survive compatible snapshot merging and stale replay', () => {
  const before = list();
  save({ ...draft('Mëllech'), quantity: '6', note: 'Whole milk', category: 'Pantry', explicitCategory: true });
  const committed = list();
  const received = mergeList(before, committed);
  expect(received.items).toEqual(committed.items);
  expect(learnedCategory(received, 'Milch')).toBe('Pantry');
  expect(mergeList(received, before).items).toEqual(committed.items);
  expect(mergeList(committed, received)).toEqual(mergeList(received, committed));
});

test('learned preferences override catalog suggestions', () => {
  save({ ...draft('Mëllech'), category: 'Pantry', explicitCategory: true });
  const d = createItemDraft(list(), { name: 'Milch', category: 'Dairy & eggs' });
  expect(d.category).toBe('Pantry');
  save(d);
  expect(list().items[1].category).toBe('Pantry');
});

test('save preserves remote fields and check clock that the user did not edit', () => {
  save(draft());
  const d = { ...draft(), quantity: '6' };
  const before = list();
  const remote = { ...before, items: before.items.map(i => ({ ...i, name: 'Remote name', note: 'Remote note', category: 'Pantry', checked: true, checkedUpdatedAt: i.updatedAt + 10, updatedAt: i.updatedAt + 10 })) };
  useListsStore.setState({ lists: [mergeList(before, remote)] });
  const clock = list().items[0].checkedUpdatedAt;
  save(d);
  expect(list().items[0]).toMatchObject({ name: 'Remote name', note: 'Remote note', category: 'Pantry', checked: true, checkedUpdatedAt: clock, quantity: 6 });
});

test('explicit aisle learns against a remote rename if name was untouched locally', () => {
  save(draft());
  const d = { ...draft(), explicitCategory: true, category: 'Pantry' };
  store().setName(list().id, list().items[0].id, 'Remote name');
  save(d);
  expect(learnedCategory(list(), 'Remote name')).toBe('Pantry');
  expect(learnedCategory(list(), 'Plastiktut')).toBeUndefined();
});

test('new and renamed drafts reject name collisions arriving after opening', () => {
  const d = draft();
  save(draft('PLASTIKTUT'));
  expect(save(d)).toEqual({ ok: false, error: 'duplicate' });
  save(draft('Apel'));
  expect(save({ ...draft('Apel'), name: ' plastiktut ' })).toEqual({ ok: false, error: 'duplicate' });
  expect(list().items).toHaveLength(2);
});

test('remote deletion cannot be resurrected by a draft', () => {
  save(draft()); const d = draft();
  store().deleteItem(list().id, list().items[0].id);
  expect(save(d)).toEqual({ ok: false, error: 'deleted' });
});
test('missing aisles reject save, but selecting an available aisle corrects the conflict', () => {
  store().addCategory(list().id, 'Bags');
  const d = { ...draft(), category: 'Bags', explicitCategory: true };
  store().removeCategory(list().id, 'Bags');
  expect(save(d)).toEqual({ ok: false, error: 'aisle' });
  expect(save({ ...d, category: 'Other' }).ok).toBe(true);
  expect(list().categoryOrder).not.toContain('Bags');
});
test('saving a draft preserves the latest aisle order', () => {
  store().addCategory(list().id, 'bags');
  const d = { ...draft(), category: 'bags', explicitCategory: true };
  store().reorderAisles(list().id, [...list().categoryOrder].reverse());
  const order = list().categoryOrder;
  save(d);
  expect(list().categoryOrder).toEqual(order);
  expect(list().items[0].category).toBe('bags');
});
test('replaced and transitioning lists reject old drafts without side effects', () => {
  const d = draft(); useListsStore.setState({ transitioning: true });
  expect(save(d)).toEqual({ ok: false, error: 'list' });
  useListsStore.setState({ transitioning: false, lists: [makeList()] });
  expect(save(d)).toEqual({ ok: false, error: 'list' });
  expect(saveList).not.toHaveBeenCalled();
});
