jest.mock('../../sync', () => ({ resyncNow: jest.fn() }));
/**
 * Screen test — ShareScreen (Uplevel-3 T3 action coverage).
 *
 * Renders the real pairing screen and exercises every user-facing action:
 * close (dismiss), "Send link" (opens the OS share sheet with the pairing
 * link), and "Scan a list code" (requests camera permission, then flips to
 * the scanner where close backs out of scanning instead of the screen).
 * Queries by role/label/text only — no testIDs, no snapshots.
 */

import React from 'react';
import { render, screen, userEvent, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Share } from 'react-native';

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
  loadHistory: jest.fn(() => Promise.resolve([])),
  recordHistory: jest.fn(() => Promise.resolve()),
  deleteHistory: jest.fn(() => Promise.resolve()),
  putHistory: jest.fn(() => Promise.resolve()),
  loadAllLists: jest.fn(() => Promise.resolve([])),
  replaceCurrentList: jest.fn(async () => {}),
  saveList: jest.fn(() => Promise.resolve()),
  deleteListFromDb: jest.fn(() => Promise.resolve()),
  putTombstone: jest.fn(() => Promise.resolve()),
  removeTombstone: jest.fn(() => Promise.resolve()),
  getSyncMeta: jest.fn(() => Promise.resolve(null)),
  setSyncMeta: jest.fn(() => Promise.resolve()),
  getAppSetting: jest.fn(() => Promise.resolve(null)),
  setAppSetting: jest.fn(() => Promise.resolve()),
}));

// The QR renderer and camera are native; stub them to plain views so the
// screen renders in jsdom without a device.
jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function QRCode() {
    return React.createElement(View, { accessibilityLabel: 'qr' });
  };
});

// Camera permission is controllable per-test via this mutable holder.
const cameraState = {
  granted: false,
  requestResult: { granted: true },
  onBarcodeScanned: null as null | ((e: { data: string }) => void),
};
jest.mock('expo-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useCameraPermissions: () => [
      { granted: cameraState.granted },
      jest.fn(() => Promise.resolve(cameraState.requestResult)),
    ],
    CameraView: (props: any) => {
      cameraState.onBarcodeScanned = props.onBarcodeScanned;
      return React.createElement(View, { accessibilityLabel: 'camera' });
    },
  };
});

import ShareScreen from '../ShareScreen';
import { useListsStore } from '../../store/lists';
import { makeList } from '../../data/list';
import { buildShareLink } from '../../sync/share';

function seedList() {
  const list = makeList('Weekly shop');
  useListsStore.setState({ lists: [list], hydrated: true, pendingJoin: false, transitioning: false });
  return list;
}

async function renderScreen(
  listId: string,
  navOverrides: Record<string, jest.Mock> = {}
) {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    setOptions: jest.fn(),
    setParams: jest.fn(),
    popToTop: jest.fn(),
    ...navOverrides,
  } as any;
  const route = { params: { listId } } as any;
  const utils = await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ShareScreen route={route} navigation={navigation} />
    </SafeAreaProvider>
  );
  return { navigation, ...utils };
}

describe('ShareScreen', () => {
  beforeEach(() => {
    useListsStore.setState({ lists: [], hydrated: true });
    cameraState.granted = false;
    cameraState.requestResult = { granted: true };
    cameraState.onBarcodeScanned = null;
    jest.restoreAllMocks();
  });

  it('closes (goes back) when the X is pressed', async () => {
    const list = seedList();
    const user = userEvent.setup();
    const { navigation } = await renderScreen(list.id);

    await user.press(screen.getByRole('button', { name: 'Close' }));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('opens the OS share sheet with the pairing link on Send link', async () => {
    const list = seedList();
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' } as any);
    const user = userEvent.setup();
    await renderScreen(list.id);

    expect(useListsStore.getState().lists[0].shareIdentity).toBeUndefined();
    await user.press(screen.getByRole('button', { name: 'Start sharing' }));
    await user.press(screen.getByRole('button', { name: 'Send link' }));

    // Sharing minted the list's secret, and the OS sheet got its link.
    const secret =
      useListsStore.getState().lists.find((l) => l.id === list.id)
        ?.shareIdentity?.secret ?? '';
    expect(secret).not.toBe('');
    expect(shareSpy).toHaveBeenCalledWith({ message: buildShareLink(secret) });
  });

  it('requests camera permission and enters scan mode on Scan a list code', async () => {
    const list = seedList();
    const user = userEvent.setup();
    await renderScreen(list.id);

    await user.press(
      screen.getByRole('button', { name: 'Scan a list code' })
    );

    // The camera view mounts and the scan title/hint appear.
    expect(await screen.findByLabelText('camera')).toBeTruthy();
    expect(screen.getByText('Scan a list code')).toBeTruthy();
  });

  it('stays on the screen (does not scan) when camera permission is denied', async () => {
    const list = seedList();
    cameraState.requestResult = { granted: false };
    const user = userEvent.setup();
    await renderScreen(list.id);

    await user.press(
      screen.getByRole('button', { name: 'Scan a list code' })
    );

    // Permission denied → no camera, the share body still shows.
    expect(screen.queryByLabelText('camera')).toBeNull();
    expect(screen.getByRole('button', { name: 'Start sharing' })).toBeTruthy();
  });

  it('close backs out of scanning first, not the whole screen', async () => {
    const list = seedList();
    cameraState.granted = true;
    const user = userEvent.setup();
    const { navigation } = await renderScreen(list.id);

    await user.press(
      screen.getByRole('button', { name: 'Scan a list code' })
    );
    expect(await screen.findByLabelText('camera')).toBeTruthy();

    // Pressing Close while scanning returns to the share view, not goBack.
    await user.press(screen.getByRole('button', { name: 'Close' }));
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Start sharing' })).toBeTruthy();
  });

  it('scanning the same shared code is a no-op', async () => {
    const list = seedList();
    cameraState.granted = true;
    // A second list already shared — scanning its link should pair to it.
    await useListsStore.getState().shareList(list.id);
    const secret =
      useListsStore.getState().lists.find((l) => l.id === list.id)!
        .shareIdentity!.secret;

    const user = userEvent.setup();
    const { navigation } = await renderScreen(list.id);

    await user.press(
      screen.getByRole('button', { name: 'Scan a list code' })
    );
    await screen.findByLabelText('camera');

    // Simulate the barcode scanner delivering the link.
    await act(async () => {
      cameraState.onBarcodeScanned!({ data: buildShareLink(secret) });
    });

    expect(navigation.popToTop).not.toHaveBeenCalled();
    expect(screen.queryByText('Replace this list?')).toBeNull();
    expect(useListsStore.getState().lists).toHaveLength(1);
  });
});

test('a different scanned code needs confirmation, cancellation preserves the list, duplicate scans cannot join twice', async () => {
  const list = seedList();
  const user = userEvent.setup();
  await renderScreen(list.id);
  await user.press(screen.getByRole('button', { name:'Scan a list code' }));
  const data = buildShareLink('A'.repeat(43)+'=');
  await act(async () => { cameraState.onBarcodeScanned!({data}); cameraState.onBarcodeScanned!({data}); });
  expect(screen.getByText('Replace this list?')).toBeTruthy();
  expect(useListsStore.getState().lists[0].id).toBe(list.id);
  await user.press(screen.getAllByRole('button', {name:'Cancel'}).at(-1)!);
  expect(useListsStore.getState().lists[0].id).toBe(list.id);
  await user.press(screen.getByRole('button', { name:'Scan a list code' }));
  await act(async () => { cameraState.onBarcodeScanned!({data}); });
  await user.press(screen.getByRole('button', { name:'Join shared list' }));
  expect(useListsStore.getState().lists).toHaveLength(1);
  expect(useListsStore.getState().lists[0].shareIdentity?.secret).toBe('A'.repeat(43)+'=');
  expect(useListsStore.getState().pendingJoin).toBe(true);
});

test('opening Sharing alone leaves the list private; Stop sharing requires confirmation', async () => {
  const list = seedList(); const user = userEvent.setup();
  await renderScreen(list.id);
  expect(useListsStore.getState().lists[0].shareIdentity).toBeUndefined();
  expect(screen.queryByLabelText('qr')).toBeNull();
  await user.press(screen.getByRole('button', {name:'Start sharing'}));
  const secret = useListsStore.getState().lists[0].shareIdentity!.secret;
  expect(screen.getByLabelText('qr')).toBeTruthy();
  await user.press(screen.getByRole('button', {name:'Stop sharing'}));
  expect(useListsStore.getState().lists[0].shareIdentity?.secret).toBe(secret);
  await user.press(screen.getAllByRole('button', {name:'Stop sharing'}).at(-1)!);
  expect(useListsStore.getState().lists[0].shareIdentity).toBeUndefined();
  expect(screen.getByRole('button', {name:'Start sharing'})).toBeTruthy();
});

test('a cancelled share link can be opened again on the same Sharing screen', async () => {
  seedList(); const user = userEvent.setup();
  const secret='A'.repeat(43)+'=';
  const navigation={goBack:jest.fn(),popToTop:jest.fn(),setParams:jest.fn()} as any;
  const view=(joinSecret?:string)=><SafeAreaProvider initialMetrics={METRICS}>
    <ShareScreen navigation={navigation} route={{params:{joinSecret}} as any}/>
  </SafeAreaProvider>;
  const result=await render(view(secret));
  expect(screen.getByText('Replace this list?')).toBeTruthy();
  expect(navigation.setParams).toHaveBeenCalledWith({joinSecret:undefined});
  await user.press(screen.getAllByRole('button',{name:'Cancel'}).at(-1)!);
  await result.rerender(view());
  await result.rerender(view(secret));
  expect(screen.getByText('Replace this list?')).toBeTruthy();
  expect(useListsStore.getState().lists[0].shareIdentity).toBeUndefined();
});
