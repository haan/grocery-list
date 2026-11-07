import React from 'react';
import { render, screen, userEvent, waitFor, act } from '@testing-library/react-native';
import { UpdateSetting } from '../UpdateSetting';
import * as Updates from 'expo-updates';
import { saveList } from '../../store/db';

const mockState = { lists: [{ id: 'test' }], pendingJoin: false, transitioning: false, flushPending: jest.fn() };
let mockNative: any;
jest.mock('expo-application', () => ({ applicationId: 'io.github.haan.grocerylist' }));
jest.mock('expo-updates', () => ({
  isEnabled: true, channel: 'production', useUpdates: () => mockNative,
  checkForUpdateAsync: jest.fn(), fetchUpdateAsync: jest.fn(), reloadAsync: jest.fn(),
}));
jest.mock('../../store/db', () => ({ saveList: jest.fn() }));
jest.mock('../../store/lists', () => ({ useListsStore: Object.assign(
  (select: any) => select(mockState), { getState: () => mockState },
) }));
jest.mock('../../sync', () => ({ flushSyncEngine: jest.fn() }));
jest.mock('../../theme', () => ({
  useTheme: () => ({ c: { fg: '#000', fgMuted: '#555', hairline: '#ddd' } }),
  fontFamily: {}, space: {}, target: { min: 48 }, type: {},
}));

beforeEach(() => {
  jest.clearAllMocks();
  require('expo-application').applicationId = 'io.github.haan.grocerylist';
  mockNative = { currentlyRunning: { isEmbeddedLaunch: true }, isUpdatePending: false };
  mockState.pendingJoin = false;
  mockState.transitioning = false;
  mockState.flushPending.mockResolvedValue(undefined);
  jest.mocked(saveList).mockResolvedValue(undefined);
  jest.mocked(Updates.checkForUpdateAsync).mockResolvedValue({ isAvailable: false } as any);
  jest.mocked(Updates.fetchUpdateAsync).mockResolvedValue({ isNew: true } as any);
  jest.mocked(Updates.reloadAsync).mockResolvedValue(undefined);
});

it('leaves Dev on Metro without calling update APIs', async () => {
  require('expo-application').applicationId = 'io.github.haan.grocerylist.dev';
  await render(<UpdateSetting />);
  expect(screen.getByText(/through Metro/)).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
  expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
});

it('checks on request, reports no compatible update and does not reload', async () => {
  await render(<UpdateSetting />);
  expect(Updates.checkForUpdateAsync).not.toHaveBeenCalled();
  await userEvent.press(screen.getByRole('button', { name: 'Check for updates' }));
  expect(await screen.findByText(/No newer update/)).toBeTruthy();
  expect(Updates.fetchUpdateAsync).not.toHaveBeenCalled();
  expect(Updates.reloadAsync).not.toHaveBeenCalled();
});

it('downloads without restarting until requested, saving local data before reload', async () => {
  jest.mocked(Updates.checkForUpdateAsync).mockResolvedValue({ isAvailable: true } as any);
  await render(<UpdateSetting />);
  await userEvent.press(screen.getByRole('button', { name: 'Check for updates' }));
  const restart = await screen.findByRole('button', { name: 'Restart to update' });
  expect(Updates.reloadAsync).not.toHaveBeenCalled();
  await userEvent.press(restart);
  await waitFor(() => expect(Updates.reloadAsync).toHaveBeenCalledTimes(1));
  expect(saveList).toHaveBeenCalledWith(mockState.lists[0]);
  expect(jest.mocked(saveList).mock.invocationCallOrder[0]).toBeLessThan(jest.mocked(Updates.reloadAsync).mock.invocationCallOrder[0]);
});

it('offers a launch-time downloaded update without forcing a restart', async () => {
  mockNative.isUpdatePending = true;
  mockNative.currentlyRunning = { isEmbeddedLaunch: false, updateId: '12345678-abcdef' };
  await render(<UpdateSetting />);
  expect(screen.getByRole('button', { name: 'Restart to update' })).toBeTruthy();
  expect(screen.getByText('Update: 12345678')).toBeTruthy();
  expect(Updates.reloadAsync).not.toHaveBeenCalled();
});

it.each(['check', 'fetch'])('allows retry after a %s failure', async kind => {
  if (kind === 'check') jest.mocked(Updates.checkForUpdateAsync).mockRejectedValueOnce(new Error('offline'));
  else {
    jest.mocked(Updates.checkForUpdateAsync).mockResolvedValueOnce({ isAvailable: true } as any);
    jest.mocked(Updates.fetchUpdateAsync).mockRejectedValueOnce(new Error('offline'));
  }
  await render(<UpdateSetting />);
  await userEvent.press(screen.getByRole('button', { name: 'Check for updates' }));
  expect(await screen.findByText(/could not be completed/)).toBeTruthy();
  await userEvent.press(screen.getByRole('button', { name: 'Check for updates' }));
  expect(await screen.findByText(/No newer update/)).toBeTruthy();
  expect(Updates.reloadAsync).not.toHaveBeenCalled();
});

it('does not reload when local persistence fails', async () => {
  mockNative.isUpdatePending = true;
  jest.mocked(saveList).mockRejectedValueOnce(new Error('disk full'));
  await render(<UpdateSetting />);
  await userEvent.press(screen.getByRole('button', { name: 'Restart to update' }));
  expect(await screen.findByText(/could not be completed/)).toBeTruthy();
  expect(Updates.reloadAsync).not.toHaveBeenCalled();
});

it('blocks restart during list replacement', async () => {
  mockNative.isUpdatePending = true;
  mockState.transitioning = true;
  await render(<UpdateSetting />);
  expect(screen.getByRole('button', { name: 'Restart to update' })).toBeDisabled();
});

it('handles a rollback to the embedded version like a pending update', async () => {
  jest.mocked(Updates.checkForUpdateAsync).mockResolvedValue({ isAvailable: false, isRollBackToEmbedded: true } as any);
  jest.mocked(Updates.fetchUpdateAsync).mockResolvedValue({ isNew: false, isRollBackToEmbedded: true } as any);
  await render(<UpdateSetting />);
  await userEvent.press(screen.getByRole('button', { name: 'Check for updates' }));
  expect(await screen.findByRole('button', { name: 'Restart to update' })).toBeTruthy();
  expect(Updates.reloadAsync).not.toHaveBeenCalled();
});

it('disables duplicate checks while a request is running', async () => {
  let resolve!: (value: any) => void;
  jest.mocked(Updates.checkForUpdateAsync).mockImplementation(() => new Promise(r => { resolve = r; }));
  await render(<UpdateSetting />);
  await userEvent.press(screen.getByRole('button', { name: 'Check for updates' }));
  expect(screen.getByRole('button', { name: 'Check for updates' })).toBeDisabled();
  await act(async () => { resolve({ isAvailable: false }); });
});
