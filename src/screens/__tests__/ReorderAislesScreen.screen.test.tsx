jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: require('react-native').View }));
jest.mock('react-native-draggable-flatlist', () => require('../../../qa/draggableFlatListMock.cjs'));
/**
 * Screen test — ReorderAislesScreen action coverage (Uplevel-3 T3).
 *
 * Renders the real screen against the real lists store and exercises every
 * user-facing action: Done (goBack), Move up, Move down, and Remove (a custom
 * aisle). Queried by role/label only — no testID, no snapshot.
 *
 * Destructive-confirm regression proof: an aisle "Remove" now routes through a
 * confirm dialog. The test asserts removeCategory has NOT run after the row
 * tap, and only runs after the confirm "Remove" button — this fails on the old
 * immediate-remove code (which is the point).
 */

import React from 'react';
import { render, screen, userEvent, fireEvent, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const METRICS = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
};

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
jest.mock('../../store/db', () => ({
  loadAllLists: jest.fn(async () => []),
  saveList: jest.fn(async () => {}),
  deleteListFromDb: jest.fn(async () => {}),
  putTombstone: jest.fn(async () => {}),
  removeTombstone: jest.fn(async () => {}),
  getSyncMeta: jest.fn(async () => null),
  setSyncMeta: jest.fn(async () => {}),
  loadAllKits: jest.fn(async () => []),
  saveKit: jest.fn(async () => {}),
}));

import ReorderAislesScreen from '../ReorderAislesScreen';
import { useListsStore } from '../../store/lists';

const LIST_ID = 'l_reorder';
// A custom aisle ("Deli") makes the Remove control appear (built-ins can't be
// removed). Produce/Bakery are built-ins used to drive up/down.
function seedList() {
  useListsStore.setState({
    hydrated: true,
    lists: [
      {
        id: LIST_ID,
        name: 'Shop',
        nameUpdatedAt: 1,
        items: [],
        categoryOrder: ['Produce', 'Bakery', 'Deli'],
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  });
}

function resetStore() {
  useListsStore.setState({ lists: [], hydrated: true });
}

function nav() {
  return { navigate: jest.fn(), goBack: jest.fn() } as any;
}

async function renderScreen(navigation = nav()) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ReorderAislesScreen
        navigation={navigation}
        route={{ params: { listId: LIST_ID } } as any}
      />
    </SafeAreaProvider>
  );
  return { navigation };
}

beforeEach(() => seedList());
afterEach(() => resetStore());

test('adds an aisle without an item, deduplicates names, and shows live updates', async () => {
  const user = userEvent.setup();
  await renderScreen();
  await user.press(screen.getByRole('button', {name:'Add aisle'}));
  expect(screen.getByRole('button', {name:'Add'})).toBeDisabled();
  await fireEvent.changeText(screen.getByDisplayValue(''), 'Freezer extras');
  await user.press(screen.getByRole('button', {name:'Add'}));
  expect(screen.getByText('Freezer extras')).toBeTruthy();
  expect(useListsStore.getState().getList(LIST_ID)!.items).toEqual([]);
  expect(useListsStore.getState().getList(LIST_ID)!.aislePreferences).toBeUndefined();
  await user.press(screen.getByRole('button', {name:'Add aisle'}));
  await fireEvent.changeText(screen.getByDisplayValue(''), 'freezer extras');
  await user.press(screen.getByRole('button', {name:'Add'}));
  expect(useListsStore.getState().getList(LIST_ID)!.categoryOrder.filter(c => c === 'Freezer extras')).toHaveLength(1);
  // A store update models receipt of the new aisle order from another phone.
  await act(() => { useListsStore.getState().reorderAisles(LIST_ID, ['Deli', 'New remote aisle', 'Produce', 'Bakery']); });
  expect(screen.getByText('New remote aisle')).toBeTruthy();
  expect(screen.queryByText('Freezer extras')).toBeNull();
  await fireEvent(screen.getByRole('adjustable', {name:'Reorder New remote aisle'}), 'accessibilityAction', {nativeEvent:{actionName:'decrement'}});
  expect(useListsStore.getState().getList(LIST_ID)!.categoryOrder).toEqual(['New remote aisle','Deli','Produce','Bakery']);
});

describe('ReorderAislesScreen', () => {
  it('drops an aisle in its new position without changing items or learned assignments', async () => {
    await renderScreen();
    const before = useListsStore.getState().getList(LIST_ID)!;
    await fireEvent(screen.getByRole('adjustable', { name: 'Reorder Uebst a Geméis' }), 'pressIn');
    expect(screen.getByRole('button', { name: 'Add aisle' })).toBeDisabled();
    await act(() => require('../../../qa/draggableFlatListMock.cjs').getProps().onDragEnd({
      data: ['Bakery', 'Deli', 'Produce'], from: 0, to: 2,
    }));
    const after = useListsStore.getState().getList(LIST_ID)!;
    expect(after.categoryOrder).toEqual(['Bakery', 'Deli', 'Produce']);
    expect(after.items).toEqual(before.items);
    expect(after.aislePreferences).toEqual(before.aislePreferences);
    expect(screen.getByRole('button', { name: 'Add aisle' })).toBeEnabled();
  });

  it('preserves aisles arriving during a drag and displays them after the drop', async () => {
    await renderScreen();
    await fireEvent(screen.getByRole('adjustable', { name: 'Reorder Uebst a Geméis' }), 'pressIn');
    await act(() => useListsStore.getState().reorderAisles(LIST_ID, ['Produce', 'Remote aisle', 'Bakery', 'Deli']));
    await act(() => require('../../../qa/draggableFlatListMock.cjs').getProps().onDragEnd({
      data: ['Bakery', 'Deli', 'Produce'], from: 0, to: 2,
    }));
    expect(useListsStore.getState().getList(LIST_ID)!.categoryOrder).toEqual(['Remote aisle', 'Bakery', 'Deli', 'Produce']);
    expect(screen.getByText('Remote aisle')).toBeTruthy();
  });

  it('renames custom aisles with a prefilled dialog and keeps their position', async () => {
    const user = userEvent.setup();
    await renderScreen();
    expect(screen.queryByRole('button',{name:'Rename Uebst a Geméis'})).toBeNull();
    await user.press(screen.getByRole('button',{name:'Rename Deli'}));
    await fireEvent.changeText(screen.getByDisplayValue('Deli'),'Chilled');
    await user.press(screen.getByRole('button',{name:'Save'}));
    expect(screen.getByRole('button',{name:'Rename Chilled'})).toBeTruthy();
    expect(screen.queryByText('Deli')).toBeNull();
    expect(useListsStore.getState().getList(LIST_ID)!.categoryOrder).toEqual(['Produce','Bakery','Chilled']);
  });

  it('rejects duplicate names visibly and lets the user cancel a rename', async () => {
    const user = userEvent.setup();
    await renderScreen();
    await user.press(screen.getByRole('button',{name:'Rename Deli'}));
    await fireEvent.changeText(screen.getByDisplayValue('Deli'),'');
    expect(screen.getByRole('button',{name:'Save'})).toBeDisabled();
    await fireEvent.changeText(screen.getByDisplayValue(''),'Bakery');
    await user.press(screen.getByRole('button',{name:'Save'}));
    expect(screen.getByRole('alert')).toHaveTextContent(/already in use/);
    expect(useListsStore.getState().getList(LIST_ID)!.categoryOrder).toContain('Deli');
    await user.press(screen.getByRole('button',{name:'Rename Deli'}));
    await fireEvent.changeText(screen.getByDisplayValue('Deli'),'Cancelled name');
    await user.press(screen.getAllByRole('button',{name:'Cancel'})[0]);
    expect(useListsStore.getState().getList(LIST_ID)!.categoryOrder).toContain('Deli');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('closes the screen when Done is pressed', async () => {
    const user = userEvent.setup();
    const { navigation } = await renderScreen();

    await user.press(screen.getByRole('button', { name: 'Done' }));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('moves an aisle down, reordering the list', async () => {
    const user = userEvent.setup();
    await renderScreen();

    // Produce is first; moving it down swaps it with Bakery.
    await fireEvent(screen.getByRole('adjustable', {name:'Reorder Uebst a Geméis'}), 'accessibilityAction', {nativeEvent:{actionName:'increment'}});

    expect(
      useListsStore.getState().lists[0].categoryOrder
    ).toEqual(['Bakery', 'Produce', 'Deli']);
  });

  it('moves an aisle up, reordering the list', async () => {
    const user = userEvent.setup();
    await renderScreen();

    // Bakery is second; moving it up swaps it with Produce.
    await fireEvent(screen.getByRole('adjustable', {name:'Reorder Brout a Gebäck'}), 'accessibilityAction', {nativeEvent:{actionName:'decrement'}});

    expect(
      useListsStore.getState().lists[0].categoryOrder
    ).toEqual(['Bakery', 'Produce', 'Deli']);
  });

  it('REMOVE is guarded by a confirm dialog — no removal until confirmed', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByRole('button', { name: 'Remove Deli' }));

    // Regression guard: the aisle must NOT be removed merely by tapping Remove.
    expect(
      useListsStore.getState().lists[0].categoryOrder
    ).toContain('Deli');

    // The confirm dialog's "Remove" button is what actually removes.
    await user.press(screen.getByRole('button', { name: 'Remove' }));
    expect(
      useListsStore.getState().lists[0].categoryOrder
    ).not.toContain('Deli');
  });
});
