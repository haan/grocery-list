import React from 'react';
import { TextInput, FlatList, StyleSheet, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import TestRenderer, { act } from 'react-test-renderer';
import ItemPicker from '../ItemPicker';

const METRICS = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
};

// Native side-effects with no bearing on the behavior under test.
jest.mock('expo-haptics', () => ({ selectionAsync: () => Promise.resolve() }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// Stub the SQLite-backed persistence so the account store runs in node
// (expo-sqlite can't load here). Persist is fire-and-forget; UI state is the SUT.
jest.mock('../../store/db', () => ({
  loadHistory: jest.fn(async () => []),
  recordHistory: jest.fn(async () => {}),
  deleteHistory: jest.fn(async () => {}),
  putHistory: jest.fn(async () => {}),
  getAppSetting: jest.fn(async () => null),
  setAppSetting: jest.fn(async () => {}),
}));

function render(onAdd: React.ComponentProps<typeof ItemPicker>['onSelect']) {
  let tree!: TestRenderer.ReactTestRenderer;
  act(() => {
    tree = TestRenderer.create(
      <SafeAreaProvider initialMetrics={METRICS}>
        <ItemPicker
          activeNames={new Set()}
          onSelect={onAdd}
          presentLabel="On list"
          presentA11y={(name) => `${name} on list`}
          addHint="Adds it to your list."
        />
      </SafeAreaProvider>
    );
  });
  return tree;
}

const input = (tree: TestRenderer.ReactTestRenderer) => tree.root.findByType(TextInput);

// Fake timers so the mount-focus timeout and the Snackbar auto-dismiss can't
// fire after the test finishes (which crashes react-test-renderer's teardown).
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('selecting keeps the query until a successful save clears it', () => {
  const onAdd = jest.fn();
  const tree = render(onAdd);

  // Type a partial term that surfaces a built-in seed suggestion.
  act(() => input(tree).props.onChangeText('ape'));
  expect(input(tree).props.value).toBe('ape');

  // Find the "apple" suggestion row (its add button carries a11y "Add apple").
  const addApple = tree.root.findAll(
    (el) =>
      el.props.accessibilityRole === 'button' &&
      el.props.accessibilityLabel === 'Äppel'
  );
  expect(addApple.length).toBeGreaterThan(0);

  act(() => addApple[0].props.onPress());

  // The item was added...
  expect(onAdd).toHaveBeenCalledWith('Äppel', expect.anything(), expect.any(Function));
  expect(input(tree).props.value).toBe('ape');
  act(() => onAdd.mock.calls[0][2](true));
  // ...and the box is now empty, ready for the next add or a clean exit.
  expect(input(tree).props.value).toBe('');

  act(() => tree.unmount());
});


test('scroll hint follows the visible letter and scroll position, then fades after stopping', () => {
  // Observe the native animation boundary; Jest does not run the native driver.
  const animation = jest.spyOn(Animated, 'timing');
  const tree = render(jest.fn());
  const list = () => tree.root.findByType(FlatList);
  const renderItem = list().props.renderItem;
  act(() => list().props.onViewableItemsChanged({ viewableItems: [{ isViewable: true, item: { t: 'item', letter: 'M' } }] }));
  const hint = () => tree.root.findByProps({ testID: 'alphabetScrollHint' });
  expect(hint().findByType(require('react-native').Text).props.children).toBe('M');
  expect(animation).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0 }));
  act(() => { list().props.onScrollBeginDrag(); jest.advanceTimersByTime(150); });
  act(() => jest.advanceTimersByTime(150));
  expect(animation).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1 }));
  act(() => list().props.onScroll({ nativeEvent: { contentOffset: { y: 500 }, contentSize: { height: 1500 }, layoutMeasurement: { height: 500 } } }));
  const position = StyleSheet.flatten(hint().props.style).transform[0].translateY.__getValue();
  expect(position).toBeGreaterThan(12); expect(position).toBeLessThan(448);
  expect(list().props.renderItem).toBe(renderItem);
  act(() => list().props.onViewableItemsChanged({ viewableItems: [{ isViewable: true, item: { t: 'header', label: 'S' } }] }));
  expect(hint().findByType(require('react-native').Text).props.children).toBe('S');
  act(() => { list().props.onMomentumScrollEnd(); jest.advanceTimersByTime(500); });
  act(() => jest.advanceTimersByTime(150));
  expect(animation).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 0 }));
  act(() => tree.unmount());
  animation.mockRestore();
});
