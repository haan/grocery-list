/** Exercise the real stack and linking entrypoint with lightweight screen contents. */
import React from 'react';
import { Linking } from 'react-native';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(async () => {}) }));
jest.mock('../../theme', () => ({ useAppFonts: () => [true] }));
jest.mock('../../shell/AppShell', () => ({
  AppShell: ({ children, navigationRef, onReady }: any) => {
    const { NavigationContainer } = require('@react-navigation/native');
    return <NavigationContainer ref={navigationRef} onReady={onReady}>{children}</NavigationContainer>;
  },
}));
const mockListState = { lists: [{ id: 'local' }], hydrated: true, hydrate: jest.fn(), flushPending: jest.fn(), joinShared: jest.fn(() => 'joined') };
const mockAccountState = { hydrated: true, hydrate: jest.fn() };
jest.mock('../../store/lists', () => ({ useListsStore: Object.assign((select: any) => select(mockListState), { getState: () => mockListState }) }));
jest.mock('../../store/account', () => ({ useAccountStore: Object.assign((select: any) => select(mockAccountState), { getState: () => mockAccountState }) }));
jest.mock('../../sync', () => ({ startSyncEngine: jest.fn(), stopSyncEngine: jest.fn(), flushSyncEngine: jest.fn() }));
jest.mock('../ListsHomeScreen', () => ({ __esModule: true, default: function Lists({ navigation }: any) {
  const { Pressable, Text } = require('react-native');
  return <Pressable accessibilityRole="button" accessibilityLabel="Home lists" onPress={() => navigation.navigate('Settings')}><Text>Home lists</Text></Pressable>;
} }));
jest.mock('../SettingsScreen', () => ({ __esModule: true, default: function Settings({ navigation }: any) {
  const { Pressable, Text } = require('react-native');
  return <Pressable accessibilityRole="button" accessibilityLabel="Back from settings" onPress={() => navigation.goBack()}><Text>Back</Text></Pressable>;
} }));
jest.mock('../ShareScreen', () => ({ __esModule: true, default: function Sharing({ route, navigation }: any) {
  const { Text, Pressable } = require('react-native');
  return <><Text>{route.params.joinSecret ? 'Confirm joining' : 'Sharing'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Back from sharing" onPress={() => navigation.goBack()}><Text>Back</Text></Pressable></>;
} }));
jest.mock('../ReorderAislesScreen', () => () => null);
import App from '../../../App';
import { buildShareLink } from '../../sync/share';

beforeEach(() => {
  jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
  mockListState.joinShared.mockClear();
});
afterEach(() => jest.restoreAllMocks());

test('opens Lists directly, navigates to Settings, and goes back without a tab bar', async () => {
  const user = userEvent.setup();
  await render(<App />);
  expect(screen.getByRole('button', { name: 'Home lists' })).toBeTruthy();
  expect(screen.queryByRole('tab')).toBeNull();
  await user.press(screen.getByRole('button', { name: 'Home lists' }));
  await user.press(await screen.findByRole('button', { name: 'Back from settings' }));
  expect(await screen.findByRole('button', { name: 'Home lists' })).toBeTruthy();
});

test('a cold-start share link opens confirmation before joining and back returns home', async () => {
  const secret = 'A'.repeat(43) + '=';
  jest.mocked(Linking.getInitialURL).mockResolvedValue(buildShareLink(secret));
  const user = userEvent.setup();
  await render(<App />);
  expect(await screen.findByText('Confirm joining')).toBeTruthy();
  expect(mockListState.joinShared).not.toHaveBeenCalled();
  await user.press(screen.getByRole('button', { name: 'Back from sharing' }));
  expect(await screen.findByRole('button', { name: 'Home lists' })).toBeTruthy();
});
