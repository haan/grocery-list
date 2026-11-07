import React from 'react';
import { render, fireEvent, userEvent, act } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ItemPicker from '../ItemPicker';
import { useAccountStore } from '../../store/account';
import { PRODUCTS } from '../../data/seedCatalogData';

const METRICS = {
  frame: { x: 0, y: 0, width: 412, height: 915 },
  insets: { top: 24, left: 0, right: 0, bottom: 24 },
};

jest.mock('expo-haptics', () => ({ selectionAsync: () => Promise.resolve() }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null], isLoaded: () => true }));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
// Stub the SQLite-backed persistence so the account store runs in node.
jest.mock('../../store/db', () => ({
  loadHistory: jest.fn(async () => []),
  recordHistory: jest.fn(async () => {}),
  deleteHistory: jest.fn(async () => {}),
  putHistory: jest.fn(async () => {}),
  getAppSetting: jest.fn(async () => null),
  setAppSetting: jest.fn(async () => {}),
}));

// Fake timers: the mount-focus timeout + Snackbar auto-dismiss must not fire
// after a test ends (crashes teardown). Real focus is a native no-op here.
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  useAccountStore.setState({ history: [], });
});

async function renderPicker(props: Partial<React.ComponentProps<typeof ItemPicker>> = {}) {
  const onAdd = jest.fn();
  const onClose = jest.fn();
  const utils = await render(
    <SafeAreaProvider initialMetrics={METRICS}>
      <ItemPicker
        activeNames={new Set()}
        onSelect={onAdd}
        presentLabel="On list"
        presentA11y={(name) => `${name} on list`}
        addHint="Adds it to your list."
        {...props}
      />
    </SafeAreaProvider>
  );
  const searchBox = () => utils.getByLabelText('Search items');
  return { ...utils, onAdd, onClose, searchBox };
}

test('tapping an item row requests details', async () => {
  const { onAdd, searchBox, getByLabelText } = await renderPicker();
  // Type a partial term that surfaces the built-in "apple" seed row.
  await fireEvent.changeText(searchBox(), 'ape');
  await fireEvent.press(getByLabelText('Äppel'));
  expect(onAdd).toHaveBeenCalledWith('Äppel', expect.anything(), expect.any(Function));
});

test('starts with a screenful and queues the entire catalog without scrolling', async () => {
  const { getAllByRole, getByText, queryByText } = await renderPicker();
  expect(getAllByRole('button').length).toBeGreaterThanOrEqual(12);
  expect(getAllByRole('button').length).toBeLessThan(PRODUCTS.length);
  expect(getByText('Preparing remaining items…')).toBeTruthy();
  // Each commit schedules the next idle batch; no scroll event is required.
  for (let i = 0; i < 24; i++) await act(() => jest.advanceTimersByTime(200));
  const labels = getAllByRole('button').map(button => button.props.accessibilityLabel);
  expect(labels).toEqual(expect.arrayContaining(PRODUCTS.map(product => product.name)));
  expect(queryByText('Preparing remaining items…')).toBeNull();
});

test('filtering finds unprepared products immediately and preserves the alphabetical view', async () => {
  const { getByLabelText, queryByLabelText, searchBox, getAllByRole } = await renderPicker();
  const firstRow = getByLabelText('Äerdbieren');
  expect(queryByLabelText('Zopp')).toBeNull();
  await fireEvent.changeText(searchBox(), 'Zopp');
  expect(getByLabelText('Zopp')).toBeTruthy();
  expect(queryByLabelText('Add “Zopp”…')).toBeNull();
  // The hidden unfiltered view continues preparing while search is in use.
  for (let i = 0; i < 24; i++) await act(() => jest.advanceTimersByTime(200));
  await fireEvent.press(getByLabelText('Clear search'));
  expect(getByLabelText('Äerdbieren')).toBe(firstRow);
  expect(getAllByRole('button').map(button => button.props.accessibilityLabel))
    .toEqual(expect.arrayContaining(PRODUCTS.map(product => product.name)));
});

test('typing a term and submitting (return key) requests typed item details', async () => {
  const { onAdd, searchBox } = await renderPicker();
  await fireEvent.changeText(searchBox(), 'Dragonfruit');
  await fireEvent(searchBox(), 'submitEditing');
  expect(onAdd).toHaveBeenCalledWith('Dragonfruit', undefined, expect.any(Function));
});

test('submitting an empty search does not select or close', async () => {
  const { onAdd, onClose, searchBox } = await renderPicker();
  await fireEvent(searchBox(), 'submitEditing');
  expect(onClose).not.toHaveBeenCalled();
  expect(onAdd).not.toHaveBeenCalled();
});

test('tapping the clear button empties the search box', async () => {
  const { searchBox, getByLabelText } = await renderPicker();
  await fireEvent.changeText(searchBox(), 'milk');
  expect(searchBox().props.value).toBe('milk');
  // The clear affordance carries the "Close" a11y label.
  await fireEvent.press(getByLabelText('Clear search'));
  expect(searchBox().props.value).toBe('');
});

test('adding a predefined name to history does not expose suggestion editing', async () => {
  const { searchBox, getByLabelText, queryByLabelText, onAdd } = await renderPicker();
  await fireEvent.changeText(searchBox(), 'Äppel');
  await act(() => useAccountStore.getState().recordUse('Äppel'));
  expect(queryByLabelText('Edit suggestion Äppel')).toBeNull();
  await fireEvent.press(getByLabelText('Äppel'));
  expect(onAdd).toHaveBeenCalledWith('Äppel', 'Produce', expect.any(Function));
});

test('the pencil opens the custom suggestion form directly', async () => {
  // Seed history so a "Recent" row with an edit affordance renders.
  useAccountStore.setState({
    history: [{ name: 'Butter maison', count: 1, lastUsed: Date.now() }] as any,
    });
  const user = userEvent.setup();
  const { getByLabelText, getByText } = await renderPicker();
  // Open the real native form under fake timers.
  await fireEvent.changeText(getByLabelText('Search items'), 'Butter maison');
  await user.press(getByLabelText('Edit suggestion Butter maison'));
  expect(getByText('Edit suggestion')).toBeTruthy();
  expect(getByLabelText('Suggestion name').props.value).toBe('Butter maison');
  expect(getByLabelText('Forget suggestion')).toBeTruthy();
});
