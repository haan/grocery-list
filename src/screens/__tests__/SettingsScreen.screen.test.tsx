/** Settings actions: navigation, data transfer, feedback, and project links. */

import React from 'react';
import { render, screen, userEvent, waitFor } from '@testing-library/react-native';
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
  getAppSetting: jest.fn(async () => null),
  setAppSetting: jest.fn(async () => {}),
}));

import SettingsScreen from '../SettingsScreen';
import { useListsStore } from '../../store/lists';
import { makeList } from '../../data/list';
import { resetToBaseStrings, setLocaleStrings, t } from '../../i18n';
import { LOCALES } from '../../i18n/locales';

function resetStore() {
  useListsStore.setState({ lists: [makeList()], hydrated: true });
}

function nav() {
  return { navigate: jest.fn(), goBack: jest.fn() } as any;
}

async function renderScreen(navigation = nav()) {
  await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <SettingsScreen navigation={navigation} route={{ params: {} } as any} />
    </SafeAreaProvider>
  );
  return { navigation };
}

beforeEach(() => {
  resetToBaseStrings();
  resetStore();
  jest.clearAllMocks();
});
afterEach(() => {
  resetToBaseStrings();
  resetStore();
});

describe('SettingsScreen', () => {
  it('keeps version and data controls without About actions or branding', async () => {
    await renderScreen();
    expect(screen.getByText(/^Version:/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Language,/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sharing' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Manage aisles' })).toBeTruthy();
    expect(screen.queryByText('Export lists')).toBeNull();
    expect(screen.queryByText('Import lists')).toBeNull();
    for (const label of ['About', 'Send feedback', 'Privacy', 'Source code', 'Acknowledgements', 'Learn more']) {
      expect(screen.queryByText(label)).toBeNull();
    }
    expect(screen.queryByRole('image', { name: 'Grocery List Dev' })).toBeNull();
  });

  it.each(['en', ...Object.keys(LOCALES)])('localizes Appearance controls in %s', async (locale) => {
    if (LOCALES[locale]) setLocaleStrings(LOCALES[locale]);
    await renderScreen();

    expect(screen.getByLabelText(t('settings.appearance')).props.accessibilityRole).toBe('radiogroup');
    for (const key of ['themeSystem', 'themeLight', 'themeDark']) {
      expect(screen.getByRole('radio', { name: t(`settings.${key}`) })).toBeTruthy();
    }
  });

  it('goes back when the Back button is pressed', async () => {
    const user = userEvent.setup();
    const { navigation } = await renderScreen();

    await user.press(screen.getByRole('button', { name: 'Back' }));
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  it('does not offer the upstream tip jar', async () => {
    await renderScreen();
    expect(screen.queryByRole('button', { name: 'Support this app' })).toBeNull();
  });

  it('does not offer store reviews in the independent app', async () => {
    await renderScreen();
    expect(screen.queryByRole('button', { name: 'Leave a review' })).toBeNull();
  });
});
