jest.mock('react-native-draggable-flatlist', () => require('../../../qa/draggableFlatListMock.cjs'));


import React, { useEffect } from 'react';
import { screen, userEvent } from '@testing-library/react-native';

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
// The stores import ./db (real SQLite); state lives in memory instead.
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
// The sync engine (relays, crypto) has no bearing on padding; the status
// store the sync bar reads stays real.
jest.mock('../../sync', () => ({ resyncNow: jest.fn() }));
// The QR renderer and camera are native; the share screen's own layout stays real.
jest.mock('react-native-qrcode-svg', () => {
  const { View } = require('react-native');
  return function QRCode() {
    return <View accessibilityLabel="qr" />;
  };
});
jest.mock('expo-camera', () => {
  const { View } = require('react-native');
  return {
    useCameraPermissions: () => [{ granted: false }, jest.fn(() => Promise.resolve({ granted: true }))],
    CameraView: () => <View accessibilityLabel="camera" />,
  };
});
// The pull-to-reveal footer is reanimated + gesture-handler worklets: native
// machinery with no bearing on padding. The screens' own layout stays real.
jest.mock('react-native-reanimated', () => {
  const { View, FlatList } = require('react-native');
  return {
    __esModule: true,
    default: { View, FlatList },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    interpolate: (v: number, inRange: number[], outRange: number[]) =>
      outRange[0] + (v - inRange[0]) * (outRange[1] - outRange[0]),
  };
});
jest.mock('react-native-gesture-handler', () => {
  const { View } = require('react-native');
  return {
    GestureDetector: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    GestureHandlerRootView: View,
  };
});

import { auditScreen } from '../edgeInsetAudit';
import ListsHomeScreen from '../../screens/ListsHomeScreen';
import ReorderAislesScreen from '../../screens/ReorderAislesScreen';
import ShareScreen from '../../screens/ShareScreen';
import SettingsScreen from '../../screens/SettingsScreen';
import AddItemsSheet from '../../components/AddItemsSheet';
import { useItemEditor } from '../../components/ItemEditor';
import { useActionMenu, usePrompt, useConfirm } from '../../components/Dialogs';
import { LanguageSetting } from '../../components/LanguageSetting';
import { Snackbar } from '../../components/Snackbar';
import { SyncStatusBar } from '../../components/SyncStatusBar';
import { useListsStore } from '../../store/lists';
import { useAccountStore } from '../../store/account';
import { markConnected, markReceived } from '../../sync/status';
import { makeList, makeItem, type GroceryList } from '../../data/list';
import { starterItemsForLocale } from '../../data/seedCatalog';

/* eslint-disable @typescript-eslint/no-explicit-any */
const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => () => {}),
} as any;
const route = (name: string, params?: object) => ({ key: name, name, params }) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */
const noop = () => {};
const HOUR = 3_600_000;
const SECRET = 'edge-inset-secret';

let shop: GroceryList;
let party: GroceryList;

beforeEach(() => {
  // This audit measures visible layout. Background preparation has dedicated
  // clock-driven coverage in AddItemsFlow; do not start it during an audit.
  jest.spyOn(global, 'requestIdleCallback').mockImplementation(() => 0);
  const now = Date.now();
  shop = makeList('Weekly shop');
  const apples = { ...makeItem('Apples', 'en', 'Produce'), quantity: 3, note: 'The crisp green ones' };
  const leftover = {
    ...makeItem('Eggs', 'en', 'Dairy & eggs'),
    checked: true,
    // Crossed off on a previous shop, so the "clear last shop's leftovers" bar shows.
    checkedAt: now - 8 * HOUR,
  };
  shop.items = [
    makeItem('Bananas', 'en', 'Produce'),
    apples,
    makeItem('Sourdough', 'en', 'Bakery'),
    makeItem('Milk', 'en', 'Dairy & eggs'),
    leftover,
  ];
  // A custom aisle (removable) near the top, where the reorder list draws it.
  shop.categoryOrder = ['Produce', 'Deli', ...shop.categoryOrder.slice(1)];
  shop.shareIdentity = { secret: SECRET, createdAt: now };
  party = makeList('Party');
  party.items = [makeItem('Crisps', 'en', 'Snacks')];
  useListsStore.setState({ lists: [shop], hydrated: true });

  useAccountStore.setState({
    hydrated: true,
    history: [
      { name: 'Coffee', count: 9, lastUsed: now - HOUR },
      { name: 'Oat milk', count: 6, lastUsed: now - 2 * HOUR },
      { name: 'Tomatoes', count: 4, lastUsed: now - 3 * HOUR },
      { name: 'Rice', count: 2, lastUsed: now - 4 * HOUR },
    ],
  });

  markConnected(SECRET, true);
  markReceived(SECRET, now - 3 * HOUR);
});

afterEach(() => jest.restoreAllMocks());

/** Render, take a step a sheet needs to open (a tap), then audit — the same
 *  canonical helper and metrics `auditScreen` uses. */
function ItemEditorOpen() {
  const editor = useItemEditor();
  useEffect(() => {
    const it = shop.items.find((i) => i.name === 'Apples')!;
    editor.open({ listId: shop.id, itemId: it.id, onRemove: noop });
  }, []);
  return editor.element;
}

function ActionMenuOpen() {
  const menu = useActionMenu();
  useEffect(() => {
    menu.open({
      title: 'Recent item',
      options: [
        { label: 'Rename', onPress: noop },

        { label: 'Forget item', destructive: true, onPress: noop },
      ],
    });
  }, []);
  return menu.element;
}

function PromptOpen() {
  const prompt = usePrompt();
  useEffect(() => {
    prompt.open({
      title: 'Rename aisle',
      initialValue: 'Weekly shop',
      confirmLabel: 'Save',
      onSubmit: noop,
    });
  }, []);
  return prompt.element;
}

function ConfirmOpen() {
  const confirm = useConfirm();
  useEffect(() => {
    confirm.open({
      title: 'Stop sharing?',
      message: 'Keep a private copy on this phone.',
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: noop,
    });
  }, []);
  return confirm.element;
}

describe("edge-inset audit — this app's screens", () => {
  it('Settings', async () => {
    expect(
      await auditScreen(<SettingsScreen navigation={navigation} route={route('Settings')} />, {
        readyText: 'Sharing',
      })
    ).toEqual([]);
  });

  it('Lists home', async () => {
    expect(
      await auditScreen(<ListsHomeScreen navigation={navigation} route={route('Lists')} />, {
        readyText: 'Sourdough',
      })
    ).toEqual([]);
  });

  it('List detail (shared, with a leftover from last shop)', async () => {
    expect(
      await auditScreen(
        <ListsHomeScreen navigation={navigation} route={route('ListDetail', { listId: shop.id })} />,
        { readyText: 'Sourdough' }
      )
    ).toEqual([]);
  });

  it('Reorder aisles', async () => {
    expect(
      await auditScreen(
        <ReorderAislesScreen navigation={navigation} route={route('ReorderAisles', { listId: shop.id })} />,
        { readyText: 'Deli' }
      )
    ).toEqual([]);
  });

  it('Share a list', async () => {
    expect(
      await auditScreen(<ShareScreen navigation={navigation} route={route('Share', { listId: shop.id })} />)
    ).toEqual([]);
  });

  it('Add items sheet (recent and catalog)', async () => {
    expect(
      await auditScreen(<AddItemsSheet visible listId={shop.id} onClose={noop} />, { readyText: 'Äerdbier' })
    ).toEqual([]);
  });

  it('Item editor', async () => {
    expect(await auditScreen(<ItemEditorOpen />, { readyText: 'Edit item' })).toEqual([]);
  });

  it('Action menu', async () => {
    expect(await auditScreen(<ActionMenuOpen />, { readyText: 'Forget item' })).toEqual([]);
  });

  it('Prompt', async () => {
    expect(await auditScreen(<PromptOpen />, { readyText: 'Rename aisle' })).toEqual([]);
  });

  it('Confirm', async () => {
    expect(await auditScreen(<ConfirmOpen />, { readyText: 'Stop sharing?' })).toEqual([]);
  });

  it('Language picker sheet', async () => {
    expect(
      await auditScreen(<LanguageSetting />, {
        interact: async () => {
          await userEvent.setup().press(screen.getByRole('button', { name: /^Language/ }));
          await screen.findByRole('radio', { name: 'English' });
        },
      })
    ).toEqual([]);
  });

  it('Snackbar', async () => {
    expect(
      await auditScreen(
        <Snackbar visible message="Crossed off Bananas" actionLabel="Undo" onAction={noop} onDismiss={noop} />
      )
    ).toEqual([]);
  });

  it('Sync status bar', async () => {
    expect(await auditScreen(<SyncStatusBar secret={SECRET} />)).toEqual([]);
  });
});
