/** Regression coverage for the localized, destructive list confirmation. */
import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Native gesture/animation infrastructure is unrelated to dialog behavior.
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { FlatList: require('react-native').FlatList },
}));
jest.mock('react-native-gesture-handler', () => ({
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('../../components/usePullRevealFooter', () => ({
  usePullRevealFooter: () => ({ pullToReveal: false }),
}));
jest.mock('../../components/FeedbackFooter', () => ({ FeedbackFooter: () => null }));

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
}));

import ListsHomeScreen from '../ListsHomeScreen';
import { useListsStore } from '../../store/lists';
import { resetToBaseStrings, setLocaleStrings, t } from '../../i18n';
import { LOCALES } from '../../i18n/locales';

beforeEach(() => {
  resetToBaseStrings();
  useListsStore.setState({ lists: [], hydrated: true });
});
afterEach(() => {
  resetToBaseStrings();
  useListsStore.setState({ lists: [], hydrated: true });
});

it.each(['en', ...Object.keys(LOCALES)])(
  'shows a translated delete confirmation in %s and only deletes after confirmation',
  async (locale) => {
    if (LOCALES[locale]) setLocaleStrings(LOCALES[locale]);
    const id = useListsStore.getState().createList('Disposable');
    const user = userEvent.setup();
    await render(
      <SafeAreaProvider initialMetrics={{
        frame: { x: 0, y: 0, width: 412, height: 915 },
        insets: { top: 24, left: 0, right: 0, bottom: 24 },
      }}>
        <ListsHomeScreen
          navigation={{ navigate: jest.fn() } as any}
          route={{ params: {} } as any}
        />
      </SafeAreaProvider>
    );

    const openConfirmation = async () => {
      await user.press(screen.getByRole('button', {
        name: t('common.optionsFor', { name: 'Disposable' }),
      }));
      await user.press(screen.getByRole('button', { name: t('common.delete') }));
      expect(await screen.findByText(t('detail.deleteListConfirm'))).toBeTruthy();
      expect(screen.getByText(t('detail.deleteList'))).toBeTruthy();
      expect(screen.queryByText('home.deleteList')).toBeNull();
      expect(screen.queryByText('home.deleteListConfirm')).toBeNull();
      expect(useListsStore.getState().lists.some((list) => list.id === id)).toBe(true);
    };

    await openConfirmation();
    // Both the backdrop and the visible Cancel button dismiss the dialog.
    const cancelButtons = screen.getAllByRole('button', { name: t('common.cancel') });
    await user.press(cancelButtons[cancelButtons.length - 1]);
    expect(useListsStore.getState().lists.some((list) => list.id === id)).toBe(true);
    await openConfirmation();
    await user.press(screen.getByRole('button', { name: t('common.delete') }));
    expect(useListsStore.getState().lists.some((list) => list.id === id)).toBe(false);
  }
);
