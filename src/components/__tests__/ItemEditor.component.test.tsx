/** Shared editor: edits stay local until Save; closing discards the draft. */

import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { View, Text, Pressable } from 'react-native';
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
// SQLite persistence is fire-and-forget; stub it so nothing touches a real DB.
jest.mock('../../store/db', () => ({
  loadHistory: () => Promise.resolve([]),
  recordHistory: () => Promise.resolve(),
  deleteHistory: () => Promise.resolve(),
  putHistory: () => Promise.resolve(),
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

import { useItemEditor } from '../ItemEditor';
import { useListsStore } from '../../store/lists';
import { useAccountStore } from '../../store/account';
import { makeItem, makeList, type GroceryItem } from '../../data/list';

const LIST_ID = 'l-test';
const ITEM_ID = 'i-test';

function seed(overrides: Partial<GroceryItem> = {}) {
  const list = makeList('Weekly shop');
  const item: GroceryItem = {
    ...makeItem('Milk', 'en', 'Dairy & eggs'),
    id: ITEM_ID,
    quantity: 2,
    ...overrides,
  };
  useListsStore.setState({ lists: [{ ...list, id: LIST_ID, items: [item] }] });
  useAccountStore.setState({ hydrated: true, history: [] });
}

function Harness({ onRemove }: { onRemove?: (i: GroceryItem) => void }) {
  const { open, element } = useItemEditor();
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="trigger"
        onPress={() =>
          open({ listId: LIST_ID, itemId: ITEM_ID, onRemove: onRemove ?? (() => {}) })
        }
      >
        <Text>trigger</Text>
      </Pressable>
      {element}
    </View>
  );
}

function wrap(ui: React.ReactElement) {
  return <SafeAreaProvider initialMetrics={METRICS}>{ui}</SafeAreaProvider>;
}

const curItem = () =>
  useListsStore.getState().lists.find((l) => l.id === LIST_ID)!.items.find((i) => i.id === ITEM_ID)!;
const curList = () => useListsStore.getState().lists.find((l) => l.id === LIST_ID)!;

async function openEditor(user: ReturnType<typeof userEvent.setup>) {
  await user.press(screen.getByRole('button', { name: 'trigger' }));
}

describe('useItemEditor', () => {
  beforeEach(() => seed());

  it('recategorizes the item to another aisle after choosing an aisle', async () => {
    const user = userEvent.setup({ delay: 0 });
    await render(wrap(<Harness />));
    await openEditor(user);

    expect(curItem().category).toBe('Dairy & eggs');
    await user.press(screen.getByRole('button', { name: 'Aisle' }));
    await user.press(screen.getByRole('button', { name: 'Uebst a Geméis' }));
    expect(curItem().category).toBe('Dairy & eggs');
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(curItem().category).toBe('Produce');
  });

  it('steps quantity up via the Stepper', async () => {
    const user = userEvent.setup({ delay: 0 });
    await render(wrap(<Harness />));
    await openEditor(user);

    expect(curItem().quantity).toBe(2);
    await user.press(screen.getByRole('button', { name: 'Increase' }));
    expect(curItem().quantity).toBe(2);
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(curItem().quantity).toBe(3);
  });

  it('learns the edited name when choosing an aisle before closing', async () => {
    const user = userEvent.setup({delay:0});
    await render(wrap(<Harness />));
    await openEditor(user);
    const input = screen.getByLabelText('Item', {includeHiddenElements:true});
    await user.clear(input);
    await user.type(input, 'Bio Mëllech 1L');
    await user.press(screen.getByRole('button', { name: 'Aisle' }));
    await user.press(screen.getByRole('button', {name:'Uebst a Geméis'}));
    expect(curItem().name).toBe('Milk');
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(curItem().name).toBe('Bio Mëllech 1L');
    expect(curList().aislePreferences).toEqual([expect.objectContaining({
      id:'name:bio mellech 1l', category:'Produce',
    })]);
  });

  it('offers existing custom aisles without an aisle creation shortcut', async () => {
    useListsStore.getState().addCategory(curList().id, 'Deli');
    const user = userEvent.setup({ delay: 0 });
    await render(wrap(<Harness />));
    await openEditor(user);

    expect(screen.queryByRole('button', { name: 'New aisle' })).toBeNull();
    expect(screen.queryByLabelText('Name this aisle')).toBeNull();
    await user.press(screen.getByRole('button', { name: 'Aisle' }));
    await user.press(screen.getByRole('button', { name: 'Deli' }));
    await user.press(screen.getByRole('button', { name: 'Save' }));
    expect(curList().categoryOrder).toContain('Deli');
    expect(curItem().category).toBe('Deli');
    expect(curList().aislePreferences).toEqual([expect.objectContaining({ id: 'name:milk', category: 'Deli' })]);
  });

  it('commits an edited name on Save and closes', async () => {
    const user = userEvent.setup({ delay: 0 });
    await render(wrap(<Harness />));
    await openEditor(user);

    const nameInput = screen.getByLabelText('Item', { includeHiddenElements: true });
    await user.clear(nameInput);
    await user.type(nameInput, 'Oat milk');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(curItem().name).toBe('Oat milk');
    // Sheet closed — the editor header is gone.
    expect(screen.queryByRole('header', { name: 'Edit item' })).toBeNull();
  });

  it('commits an edited note on Save', async () => {
    const user = userEvent.setup({ delay: 0 });
    await render(wrap(<Harness />));
    await openEditor(user);

    const noteInput = screen.getByLabelText('Note', { includeHiddenElements: true });
    await user.type(noteInput, 'the big one');
    await user.press(screen.getByRole('button', { name: 'Save' }));

    expect(curItem().note).toBe('the big one');
  });

  it('discards pending edits via the scrim (Close)', async () => {
    const user = userEvent.setup({ delay: 0 });
    await render(wrap(<Harness />));
    await openEditor(user);

    const nameInput = screen.getByLabelText('Item', { includeHiddenElements: true });
    await user.clear(nameInput);
    await user.type(nameInput, 'Whole milk');
    await user.press(screen.getByRole('button', { name: 'Close' }));

    expect(curItem().name).toBe('Milk');
    expect(screen.queryByRole('header', { name: 'Edit item' })).toBeNull();
  });

  it('bubbles the item to onRemove and closes when Remove is pressed', async () => {
    const user = userEvent.setup({ delay: 0 });
    const onRemove = jest.fn();
    await render(wrap(<Harness onRemove={onRemove} />));
    await openEditor(user);

    await user.press(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove.mock.calls[0][0].id).toBe(ITEM_ID);
    expect(screen.queryByRole('header', { name: 'Edit item' })).toBeNull();
  });
});
