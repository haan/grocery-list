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
  loadAllKits: jest.fn(async () => []),
  saveKit: jest.fn(async () => {}),
  getAppSetting: jest.fn(async () => null),
  setAppSetting: jest.fn(async () => {}),
}));

// Export / import go through the file/share stack — stub them; the SUT is that
// the row is wired to the handler, and (import) that its result reaches state.
jest.mock('../../lib/transfer', () => ({
  exportLists: jest.fn(async () => {}),
  pickAndParseLists: jest.fn(async () => []),
}));

// Preserve the real link constants/version; spy on the link-out functions so we
// can assert a press without opening a browser / store.
jest.mock('../../lib/links', () => {
  const actual = jest.requireActual('../../lib/links');
  return {
    ...actual,
    openUrl: jest.fn(),
  };
});

import SettingsScreen from '../SettingsScreen';
import { useListsStore } from '../../store/lists';
import { pickAndParseLists } from '../../lib/transfer';
import { openUrl, REPO_URL } from '../../lib/links';
import { makeList } from '../../data/list';
import { resetToBaseStrings, setLocaleStrings, t } from '../../i18n';
import { LOCALES } from '../../i18n/locales';

function resetStore() {
  useListsStore.setState({ lists: [], hydrated: true });
}

function nav() {
  return { navigate: jest.fn(), goBack: jest.fn() } as any;
}

// The Settings screen is rendered inside the feedback context in the real app;
// mock the provider so "Send feedback" resolves to a spy instead of composing mail.
const mockOpenFeedback = jest.fn();
jest.mock('../../feedback/FeedbackProvider', () => ({
  useFeedback: () => ({ open: mockOpenFeedback }),
  FeedbackProvider: ({ children }: { children: React.ReactNode }) => children,
}));

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

  it('exports lists from the Export row', async () => {
    const { exportLists } = require('../../lib/transfer');
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByRole('button', { name: 'Export lists' }));
    expect(exportLists).toHaveBeenCalledTimes(1);
  });

  it('imports lists from the Import row and reports the count', async () => {
    // The picker returns one list; importLists must fold it into state and the
    // screen must show the added-count status.
    (pickAndParseLists as jest.Mock).mockResolvedValueOnce([makeList('Imported')]);
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByRole('button', { name: 'Import lists' }));

    await waitFor(() =>
      expect(useListsStore.getState().lists.map((l) => l.name)).toContain(
        'Imported'
      )
    );
    expect(screen.getByText('Added 1 list.')).toBeTruthy();
  });

  it('does not offer the upstream tip jar', async () => {
    await renderScreen();
    expect(screen.queryByRole('button', { name: 'Support this app' })).toBeNull();
  });

  it('opens the feedback flow from the Send feedback row', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByRole('button', { name: 'Send feedback' }));
    expect(mockOpenFeedback).toHaveBeenCalledTimes(1);
  });

  it('does not offer store reviews in the independent app', async () => {
    await renderScreen();
    expect(screen.queryByRole('button', { name: 'Leave a review' })).toBeNull();
  });

  it('opens the privacy page from the Privacy row', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByRole('button', { name: 'Privacy' }));
    expect(openUrl).toHaveBeenCalledWith(expect.stringContaining('http'));
  });

  it('opens the source page from the Source code row', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(screen.getByRole('button', { name: 'Source code' }));
    expect(openUrl).toHaveBeenCalledWith(expect.stringContaining('github.com'));
  });

  it('navigates to Acknowledgements from its row', async () => {
    const user = userEvent.setup();
    const { navigation } = await renderScreen();

    await user.press(screen.getByRole('button', { name: 'Acknowledgements' }));
    expect(navigation.navigate).toHaveBeenCalledWith('Acknowledgements');
  });

  it('opens the studio site from the Learn more link', async () => {
    const user = userEvent.setup();
    await renderScreen();

    await user.press(
      screen.getByRole('button', { name: 'Learn more' })
    );
    expect(openUrl).toHaveBeenCalledWith(REPO_URL);
  });
});
