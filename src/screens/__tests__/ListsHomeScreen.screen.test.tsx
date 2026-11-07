import { seedList } from '../../../qa/singleListFixture';
/** Regression coverage for the localized, destructive list confirmation. */
import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
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
jest.mock('../../store/db', () => ({
  loadAllLists: jest.fn(async () => []),
  saveList: jest.fn(async () => {}),
  deleteListFromDb: jest.fn(async () => {}),
  putTombstone: jest.fn(async () => {}),
  removeTombstone: jest.fn(async () => {}),
  getSyncMeta: jest.fn(async () => null),
  setSyncMeta: jest.fn(async () => {}),
  getAppSetting: jest.fn(async () => null),
  setAppSetting: jest.fn(async () => {}),
  recordHistory: jest.fn(async () => {}),
}));

import ListsHomeScreen from '../ListsHomeScreen';
import AddItemsSheet from '../../components/AddItemsSheet';
import { useAccountStore } from '../../store/account';
import { useListsStore } from '../../store/lists';
import { resetToBaseStrings, setLocaleStrings, t } from '../../i18n';
import { LOCALES } from '../../i18n/locales';

beforeEach(() => {
  resetToBaseStrings();
  useListsStore.setState({ lists: [], hydrated: true });
  useAccountStore.setState({ history: [], hydrated: true });
});

test('home shows items directly with Sharing, Settings, and a compact footer', async () => {
  const id = seedList(useListsStore, 'Disposable');
  const navigation = { navigate: jest.fn() } as any;
  const user = userEvent.setup();
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 412, height: 915 }, insets: { top: 24, left: 0, right: 0, bottom: 24 } }}>
    <ListsHomeScreen navigation={navigation} route={{ name: 'Lists' } as any} />
  </SafeAreaProvider>);
  expect(screen.queryByText('Send feedback')).toBeNull();
  expect(screen.queryByRole('image', { name: 'Grocery List Dev' })).toBeNull();
  expect(screen.queryByRole('tab')).toBeNull();
  expect(screen.getByRole('header', { name: 'Grocery List' })).toBeTruthy();
  expect(screen.queryByText('Disposable')).toBeNull();
  expect(screen.queryByText('New list')).toBeNull();
  expect(screen.getByRole('button', { name: 'Not shared' })).toBeTruthy();
  await user.press(screen.getByRole('button', { name: 'Sharing' }));
  expect(navigation.navigate).toHaveBeenCalledWith('Share');
  await user.press(screen.getByRole('button', { name: 'Settings' }));
  expect(navigation.navigate).toHaveBeenCalledWith('Settings');
  await user.press(screen.getByRole('button', { name: 'Add an item' }));
  expect(screen.getByLabelText('Search items')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Settings' })).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByLabelText('Search items')).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Settings' }));
  expect(navigation.navigate).toHaveBeenLastCalledWith('Settings');
});

test('Add items opens the picker directly and applies learned aisles to suggestions', async () => {
  const state = useListsStore.getState();
  const id = seedList(useListsStore, 'Disposable');
  state.addItem(id, 'Äppel');
  const apple = useListsStore.getState().getList(id)!.items[0];
  state.recategorize(id, apple.id, 'Pantry');
  state.deleteItem(id, apple.id);
  const close = jest.fn();
  const user = userEvent.setup();
  await render(<SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 412, height: 915 }, insets: { top: 24, left: 0, right: 0, bottom: 24 } }}>
    <AddItemsSheet visible listId={id} onClose={close} />
  </SafeAreaProvider>);
  expect(screen.queryByRole('tab')).toBeNull();
  expect(screen.queryByText('Kits')).toBeNull();
  const input = screen.getByLabelText('Search items');
  await user.type(input, 'ape');
  await user.press(screen.getByRole('button', { name: 'Äppel' }));
  await user.press(screen.getByRole('button', { name: 'Add item' }));
  const added = useListsStore.getState().getList(id)!.items.filter(i => !i.deletedAt);
  expect(added).toEqual([expect.objectContaining({ name: 'Äppel', category: 'Pantry' })]);
  expect(input.props.value).toBe('');
  await user.press(screen.getByRole('button', { name: 'Close' }));
  expect(close).toHaveBeenCalledTimes(1);
});
afterEach(() => {
  resetToBaseStrings();
  useListsStore.setState({ lists: [], hydrated: true });
});
