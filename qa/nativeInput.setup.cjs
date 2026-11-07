// RN 0.86 exposes TextInput.setSelection, but its Jest preset omits this command.
// Mock only the native boundary; prompt selection timing stays real in tests.
const { TextInput } = require('react-native');
// Native locale settings are deterministic in tests; individual locale tests
// replace this return value to simulate Android's ordered language preferences.
jest.mock('expo-localization', () => ({ getLocales: jest.fn(() => [{ languageTag: 'en-US', languageCode: 'en' }]) }));
TextInput.prototype.setSelection = jest.fn();

// RN's runtime supplies idle scheduling; its Jest preset does not. Keep the
// deferred work cancellable and driven by the test clock.
global.requestIdleCallback = jest.fn(callback => setTimeout(() => callback({
  didTimeout: false, timeRemaining: () => 50,
}), 0));
global.cancelIdleCallback = jest.fn(handle => clearTimeout(handle));
