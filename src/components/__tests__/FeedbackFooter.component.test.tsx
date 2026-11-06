/** Feedback action coverage for the list footer. */

import React from 'react';
import { render, screen, userEvent } from '@testing-library/react-native';

jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  isLoaded: () => true,
  loadAsync: () => Promise.resolve(),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// The wordmark's pull-to-reveal animation is reanimated-backed. Reanimated 4.5
// dropped its self-contained `/mock` entry point — it now loads the real index,
// which reaches for the worklets native module and throws under jest — so the
// three pieces the footer actually imports are stubbed to plain React.
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: { View },
    useAnimatedStyle: (fn: () => unknown) => fn(),
    interpolate: (v: number, inRange: number[], outRange: number[]) =>
      outRange[0] + (v - inRange[0]) * (outRange[1] - outRange[0]),
  };
});

// Supply the feedback context via a mock so we can assert `open()` fired.
// (Prefixed `mock` so jest's hoisted factory may reference it.)
const mockOpenFeedback = jest.fn();
jest.mock('../../feedback/FeedbackProvider', () => ({
  useFeedback: () => ({ open: mockOpenFeedback }),
}));

import { FeedbackFooter } from '../FeedbackFooter';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('FeedbackFooter', () => {

  it('has no donation action', async () => {
    await render(<FeedbackFooter />);

    expect(
      screen.queryByRole('button', { name: 'Support' })
    ).toBeNull();
  });

  it('opens the feedback sheet when Send feedback is pressed', async () => {
    const user = userEvent.setup();

    await render(<FeedbackFooter />);

    await user.press(screen.getByRole('button', { name: 'Send feedback' }));

    expect(mockOpenFeedback).toHaveBeenCalledTimes(1);
  });
});
