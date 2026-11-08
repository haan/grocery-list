import React from 'react';
import { BackHandler } from 'react-native';
import { act, render, screen, fireEvent, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
jest.mock('expo-haptics', () => ({
  selectionAsync: () => Promise.resolve(),
  notificationAsync: () => Promise.resolve(),
  NotificationFeedbackType: { Warning: 'warning' },
}));
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: () => Promise.resolve(),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// SQLite persistence is fire-and-forget; stub it so nothing touches a real DB.
jest.mock('../../store/db', () => ({
  loadHistory: () => Promise.resolve([]),
  recordHistory: () => Promise.resolve(),
  deleteHistory: () => Promise.resolve(),
  putHistory: () => Promise.resolve(),
  renameHistory: () => Promise.resolve(),
  loadAllLists: () => Promise.resolve([]),
  saveList: () => Promise.resolve(),
  deleteListFromDb: () => Promise.resolve(),
  putTombstone: () => Promise.resolve(),
  removeTombstone: () => Promise.resolve(),
  getSyncMeta: () => Promise.resolve(null),
  setSyncMeta: () => Promise.resolve(),
  getAppSetting: () => Promise.resolve(null),
  setAppSetting: () => Promise.resolve(),
}));


import AddItemsSheet from '../AddItemsSheet';
import { useListsStore } from '../../store/lists';
import { useAccountStore } from '../../store/account';
import { makeList, makeItem } from '../../data/list';
import { PRODUCTS } from '../../data/seedCatalogData';
const list = () => useListsStore.getState().lists[0];
const search = () => screen.getByLabelText('Search items');
const press = async (name: string) => fireEvent.press(screen.getByRole('button', { name }));
const chooseAisle = async (name: string) => { await press('Aisle'); await press(name); };
const type = async (label: string, value: string) => fireEvent.changeText(screen.getByLabelText(label), value);
async function setup() {
  const onClose = jest.fn();
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 412, height: 915 }, insets: { top: 24, bottom: 24, left: 0, right: 0 } }}>
    <AddItemsSheet visible listId={list().id} onClose={onClose} />
  </SafeAreaProvider>);
  return { onClose };
}
beforeEach(() => {
  jest.useFakeTimers();
  useListsStore.setState({ lists: [makeList()], hydrated: true, pendingJoin: false, transitioning: false });
  useAccountStore.setState({ history: [], hydrated: true });
});
afterEach(() => jest.useRealTimers());

test('prepares hidden rows once and reuses them on opening and reopening', async () => {
  const close = jest.fn();
  const view = (visible: boolean) => <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 412, height: 915 }, insets: { top: 24, bottom: 24, left: 0, right: 0 } }}>
    <AddItemsSheet visible={visible} listId={list().id} onClose={close} />
  </SafeAreaProvider>;
  const ui = await render(view(false));
  await act(() => jest.advanceTimersByTime(1));
  const row = screen.getByRole('button', { name: 'Äerdbieren', includeHiddenElements: true });
  expect(screen.queryByRole('button', { name: 'Äerdbieren' })).toBeNull();
  expect(screen.getByTestId('addItemsSurface', { includeHiddenElements: true }).props.pointerEvents).toBe('none');
  await ui.rerender(view(true));
  expect(screen.getByRole('button', { name: 'Äerdbieren' })).toBe(row);
  await type('Search items', 'Plastiktut');
  await ui.rerender(view(false));
  expect(screen.queryByLabelText('Search items')).toBeNull();
  // Closing before completion must not stop preparation or require scrolling.
  for (let i = 0; i < 24; i++) await act(() => jest.advanceTimersByTime(200));
  await ui.rerender(view(true));
  expect(search().props.value).toBe('');
  const reopenedRow = screen.getByRole('button', { name: 'Äerdbieren' });
  expect(reopenedRow).toBe(row);
  expect(screen.getAllByRole('button').map(button => button.props.accessibilityLabel))
    .toEqual(expect.arrayContaining(PRODUCTS.map(product => product.name)));
  expect(screen.queryByText('Preparing remaining items…')).toBeNull();
  await ui.rerender(view(false));
  await ui.rerender(view(true));
  expect(screen.getByRole('button', { name: 'Äerdbieren' })).toBe(reopenedRow);
  expect(list().items).toEqual([]);
});

test('Android Back closes the browser and its listener is removed when hidden', async () => {
  const remove = jest.fn();
  const listener = jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove });
  const close = jest.fn();
  const view = (visible: boolean) => <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 412, height: 915 }, insets: { top: 24, bottom: 24, left: 0, right: 0 } }}>
    <AddItemsSheet visible={visible} listId={list().id} onClose={close} />
  </SafeAreaProvider>;
  const ui = await render(view(true));
  const handler = listener.mock.calls.find(call => call[0] === 'hardwareBackPress')![1];
  await act(() => { expect(handler({ type: 'hardwareBackPress', timeStamp: 1 })).toBe(true); });
  expect(close).toHaveBeenCalledTimes(1);
  await ui.rerender(view(false));
  expect(remove).toHaveBeenCalledTimes(1);
  listener.mockRestore();
});

test('Plastiktut: no match → complete details → one item and cleared search', async () => {
  await setup();
  await type('Search items', 'Plastiktut');
  expect(screen.getByText('No matching suggestions')).toBeTruthy();
  await press('Add “Plastiktut”…');
  expect(screen.getByLabelText('Item').props.value).toBe('Plastiktut');
  expect(screen.getByRole('button', { name: 'Aisle' }).props.accessibilityValue.text).toBe('Aneres');
  await type('Quantity', '6'); await type('Note', 'Strong bags'); await chooseAisle('Stot');
  expect(list().items).toEqual([]);
  await press('Add item');
  expect(list().items).toEqual([expect.objectContaining({ name: 'Plastiktut', quantity: 6, note: 'Strong bags', category: 'Household' })]);
  expect(search().props.value).toBe('');
  expect(screen.getByText('Added to list')).toBeTruthy();
  expect(useAccountStore.getState().history[0].count).toBe(1);
});

test('suggestions and keyboard open drafts; cancel retains query and has no side effects', async () => {
  await setup(); await type('Search items', 'ape'); await press('Äppel');
  expect(screen.getByLabelText('Item').props.value).toBe('Äppel');
  await press('Cancel');
  expect(search().props.value).toBe('ape');
  expect(list().items).toEqual([]);
  await type('Search items', 'Plastiktut');
  await fireEvent(search(), 'submitEditing');
  expect(screen.getByLabelText('Item').props.value).toBe('Plastiktut');
  await press('Cancel');
  expect(useAccountStore.getState().history).toEqual([]);
});

test('custom action is hidden for empty searches and exact names or aliases', async () => {
  await setup();
  expect(screen.queryByRole('button', { name: /Add.*…/ })).toBeNull();
  await type('Search items', 'Äppel');
  expect(screen.getByRole('button', { name: 'Äppel' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Add “Äppel”…' })).toBeNull();
  await type('Search items', '  mellech ');
  expect(screen.queryByRole('button', { name: /Add.*…/ })).toBeNull();
  await type('Search items', 'Milch');
  expect(screen.queryByRole('button', { name: /Add.*…/ })).toBeNull();
  await fireEvent(search(), 'submitEditing');
  expect(screen.queryByLabelText('Item')).toBeNull();
  await type('Search items', 'Plastiktut'); await press('Add “Plastiktut”…');
  await type('Item', '');
  expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled();
});

test('partial matches retain suggestions and allow adding the typed name through details', async () => {
  await setup(); await type('Search items', 'glace');
  expect(screen.getByRole('button', { name: 'Äerdbiersglace' })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Bananneglace' })).toBeTruthy();
  await press('Add “glace”…');
  expect(screen.getByLabelText('Item').props.value).toBe('Glace');
  expect(list().items).toEqual([]);
  await press('Cancel'); expect(search().props.value).toBe('glace');
  await fireEvent(search(), 'submitEditing');
  expect(screen.getByLabelText('Item').props.value).toBe('Glace');
  await type('Quantity', '6'); await press('Add item');
  expect(list().items).toEqual([expect.objectContaining({ name: 'Glace', quantity: 6 })]);
  expect(search().props.value).toBe('');
  await type('Search items', 'glace');
  expect(screen.getByRole('button', { name: 'Glace, on your list' })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Add “glace”…' })).toBeNull();
});

test('aisle chooser marks the current aisle and dismissal preserves the form draft', async () => {
  await setup(); await type('Search items', 'Plastiktut'); await press('Add “Plastiktut”…');
  await type('Quantity', '6'); await type('Note', 'Keep this note');
  await press('Aisle');
  expect(screen.getByRole('button', { name: 'Aneres' }).props.accessibilityState.selected).toBe(true);
  await press('Cancel');
  expect(screen.getByLabelText('Quantity').props.value).toBe('6');
  expect(screen.getByLabelText('Note').props.value).toBe('Keep this note');
  await press('Aisle'); await fireEvent.press(screen.getByTestId('itemEditorDismiss'));
  expect(screen.getByLabelText('Item').props.value).toBe('Plastiktut');
  await press('Aisle'); await fireEvent(screen.getByRole('header', { name: 'Choose aisle' }), 'requestClose');
  expect(screen.getByLabelText('Note').props.value).toBe('Keep this note');
  expect(list().items).toEqual([]);
  await chooseAisle('Aneres'); await press('Add item');
  expect(list().aislePreferences).toEqual([expect.objectContaining({ id: 'name:plastiktut', category: 'Other' })]);
});

test('invalid quantity disables save with explanation; +/- and typed total work', async () => {
  await setup(); await type('Search items', 'Plastiktut'); await press('Add “Plastiktut”…');
  for (const invalid of ['', '0', '100', '1.5']) {
    await type('Quantity', invalid);
    expect(screen.getByRole('button', { name: 'Add item' })).toBeDisabled();
    expect(screen.getByText('Enter a whole number from 1 to 99.')).toBeTruthy();
  }
  await type('Quantity', '6'); await press('Increase');
  expect(screen.getByLabelText('Quantity').props.value).toBe('7');
  await press('Decrease'); await press('Add item'); expect(list().items[0].quantity).toBe(6);
});

test('add form selects existing aisles without offering aisle creation', async () => {
  useListsStore.getState().addCategory(list().id, 'Bags');
  await setup(); await type('Search items', 'Plastiktut'); await press('Add “Plastiktut”…');
  expect(screen.queryByRole('button', { name: 'New aisle' })).toBeNull();
  expect(screen.queryByLabelText('Name this aisle')).toBeNull();
  await chooseAisle('Bags'); await press('Cancel');
  expect(list().items).toEqual([]);
  expect(list().aislePreferences ?? []).toEqual([]);
  await type('Search items', 'Plastiktut'); await press('Add “Plastiktut”…');
  await chooseAisle('Bags'); await press('Add item');
  expect(list().items[0].category).toBe('Bags'); expect(list().categoryOrder.slice(-2)).toEqual(['Bags', 'Other']);
  expect(list().aislePreferences).toEqual([expect.objectContaining({ id: 'name:plastiktut', category: 'Bags' })]);
});

test('existing unchecked item opens current details and saves desired total', async () => {
  const item = { ...makeItem('Plastiktut'), quantity: 2, note: 'Original' };
  useListsStore.setState({ lists: [{ ...list(), items: [item] }] });
  await setup(); await type('Search items', 'Plastiktut'); await fireEvent(search(), 'submitEditing');
  expect(screen.getByLabelText('Quantity').props.value).toBe('2');
  expect(screen.getByLabelText('Note').props.value).toBe('Original');
  await type('Quantity', '6'); await press('Save');
  expect(list().items).toHaveLength(1); expect(list().items[0].quantity).toBe(6);
  expect(useAccountStore.getState().history).toEqual([]);
});

test('checked item remains checked until Add item confirms re-addition', async () => {
  const item = { ...makeItem('Äppel'), quantity: 8, checked: true, note: 'Local' };
  useListsStore.setState({ lists: [{ ...list(), items: [item] }] });
  await setup(); await type('Search items', 'Äppel'); await press('Äppel, on your list');
  expect(screen.getByLabelText('Quantity').props.value).toBe('1'); expect(list().items[0].checked).toBe(true);
  await press('Cancel'); expect(list().items[0].checked).toBe(true);
  await press('Äppel, on your list'); await press('Add item');
  expect(list().items[0]).toMatchObject({ checked: false, quantity: 1, note: 'Local' });
});

test('Android Back discards fields and aisles; empty Enter only dismisses keyboard', async () => {
  const { onClose } = await setup(); await fireEvent(search(), 'submitEditing'); expect(onClose).not.toHaveBeenCalled();
  await type('Search items', 'Plastiktut'); await press('Add “Plastiktut”…');
  await fireEvent(screen.getByLabelText('Item'), 'requestClose');
  expect(list().items).toEqual([]); expect(search()).toBeTruthy(); expect(onClose).not.toHaveBeenCalled();
});

test('remote name conflict stays open and can be corrected', async () => {
  await setup(); await type('Search items', 'Plastiktut'); await fireEvent(search(), 'submitEditing');
  await act(() => useListsStore.getState().addItem(list().id, 'PLASTIKTUT'));
  await press('Add item'); expect(screen.getByText(/An item with this name already exists/)).toBeTruthy();
  await type('Item', 'Other bags'); await press('Add item'); expect(list().items).toHaveLength(2);
});

test('remote deletion is explained without resurrecting the item', async () => {
  const item = makeItem('Äppel');
  useListsStore.setState({ lists: [{ ...list(), items: [item] }] });
  await setup(); await type('Search items', 'Äppel'); await press('Äppel, on your list');
  await act(() => useListsStore.getState().deleteItem(list().id, item.id));
  await press('Save');
  expect(screen.getByText(/This item was removed on another phone/)).toBeTruthy();
  expect(list().items[0].deletedAt).toBeDefined();
  await press('Cancel'); expect(search().props.value).toBe('Äppel');
});

test('a deleted aisle is explained and choosing another aisle allows saving', async () => {
  useListsStore.getState().addCategory(list().id, 'Bags');
  await setup(); await type('Search items', 'Plastiktut'); await press('Add “Plastiktut”…'); await chooseAisle('Bags');
  await act(() => useListsStore.getState().removeCategory(list().id, 'Bags'));
  await press('Add item'); expect(screen.getByText(/This aisle is no longer available/)).toBeTruthy();
  await chooseAisle('Aneres'); await press('Add item');
  expect(list().items[0].category).toBe('Other'); expect(list().categoryOrder).not.toContain('Bags');
});

test('replacing the list closes an open draft without saving it', async () => {
  await setup(); await type('Search items', 'Plastiktut'); await press('Add “Plastiktut”…');
  await act(() => useListsStore.setState({ lists: [makeList()] }));
  expect(screen.queryByLabelText('Item')).toBeNull(); expect(list().items).toEqual([]);
});

test('Remove ignores unsaved edits and Undo restores the original item', async () => {
  const item = { ...makeItem('Äppel'), quantity: 2, note: 'Original' };
  useListsStore.setState({ lists: [{ ...list(), items: [item] }] });
  await setup(); await type('Search items', 'Äppel'); await press('Äppel, on your list');
  await type('Note', 'Do not save'); await type('Quantity', '6'); await press('Remove');
  expect(list().items[0].deletedAt).toBeDefined(); await press('Undo');
  expect(list().items[0]).toMatchObject({ quantity: 2, note: 'Original' }); expect(list().items[0].deletedAt).toBeUndefined();
});

test('Recent rename, forget, and Undo remain independent of item drafts', async () => {
  useAccountStore.setState({ history: [{ name: 'Old bags', count: 3, lastUsed: 100 }] });
  const original = makeItem('Old bags');
  useListsStore.setState({ lists: [{ ...list(), items: [original] }] });
  await setup(); const user = userEvent.setup({ delay: 0 });
  await type('Search items', 'Old bags');
  await user.press(screen.getByRole('button', { name: 'Edit suggestion Old bags' }));
  expect(screen.getByRole('header', { name: 'Edit suggestion' })).toBeTruthy();
  expect(screen.getByText('Changes your suggestions, not items already on your list.')).toBeTruthy();
  const input = screen.getByLabelText('Suggestion name'); await fireEvent.changeText(input, 'New bags');
  await user.press(screen.getByRole('button', { name: 'Save' }));
  expect(useAccountStore.getState().history[0]).toMatchObject({ name: 'New bags', count: 3 });
  await type('Search items', 'New bags');
  await user.press(screen.getByRole('button', { name: 'Edit suggestion New bags' }));
  await fireEvent.changeText(screen.getByLabelText('Suggestion name'), 'Unsaved name');
  await user.press(screen.getByRole('button', { name: 'Forget suggestion' }));
  await act(() => jest.advanceTimersByTime(300));
  expect(useAccountStore.getState().history).toEqual([]);
  await user.press(screen.getByRole('button', { name: 'Undo' }));
  expect(useAccountStore.getState().history[0]).toMatchObject({ name: 'New bags', count: 3 });
  expect(list().items).toEqual([original]);
});
