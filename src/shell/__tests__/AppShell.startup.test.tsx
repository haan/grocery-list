import React from 'react';
import { Text } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import * as SplashScreen from 'expo-splash-screen';
import { AppShell } from '../AppShell';

jest.mock('expo-splash-screen', () => ({ hideAsync: jest.fn(async () => {}) }));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-gesture-handler', () => ({ GestureHandlerRootView: require('react-native').View }));
jest.mock('../../feedback/diagnostics', () => ({ collectDiagnostics: () => ({}) }));
jest.mock('../../feedback/log', () => ({ installDiagnostics: jest.fn(), logEvent: jest.fn(), logNav: jest.fn(), logError: jest.fn() }));
jest.mock('../../theme', () => ({
  ...jest.requireActual('../../theme'),
  useApplyThemePreference: jest.fn(),
}));
jest.mock('../../i18n/localePreference', () => ({ useApplyLocalePreference: jest.fn(), useLocaleVersion: () => 0 }));

beforeEach(() => jest.clearAllMocks());

test('waits for hydration and reveals laid-out content without an animation delay', async () => {
  const view = await render(<AppShell ready={false}><Text>Shopping list</Text></AppShell>);
  expect(screen.queryByText('Shopping list')).toBeNull();
  expect(SplashScreen.hideAsync).not.toHaveBeenCalled();

  await view.rerender(<AppShell ready><Text>Shopping list</Text></AppShell>);
  expect(screen.getByText('Shopping list')).toBeTruthy();
  expect(SplashScreen.hideAsync).not.toHaveBeenCalled();
  await fireEvent(screen.getByTestId('startup-content'), 'layout');
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  await fireEvent(screen.getByTestId('startup-content'), 'layout');
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
});

test('reveals startup error content even without a mounted navigator', async () => {
  await render(<AppShell ready><Text>Unable to load data. Retry</Text></AppShell>);
  await fireEvent(screen.getByTestId('startup-content'), 'layout');
  expect(SplashScreen.hideAsync).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Unable to load data. Retry')).toBeTruthy();
});
