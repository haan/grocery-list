/**
 * Component test — the +/- quantity Stepper (Uplevel-3 T3 action coverage).
 * Proves the two visible controls are wired: + steps up, − removes at floor.
 * Queries by role/label per the ScreenHeader exemplar; no snapshots, no testID.
 */

import React, { useState } from 'react';
import { TextInput } from 'react-native';
import { render, screen, userEvent, fireEvent } from '@testing-library/react-native';

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

import { Stepper } from '../Stepper';

describe('Stepper', () => {
  it('selects quantity on focus without reselecting replacement characters', async () => {
    function EditableQuantity() {
      const [quantity, setQuantity] = useState('1');
      return <Stepper value={Number(quantity)} onChange={q => setQuantity(String(q))}
        inputValue={quantity} onChangeText={setQuantity} />;
    }
    const selection = jest.spyOn(TextInput.prototype, 'setSelection');
    selection.mockClear();
    await render(<EditableQuantity />);
    const input = screen.getByLabelText('Quantity');
    expect(input.props.selectTextOnFocus).toBeFalsy();
    await fireEvent(input, 'focus');
    expect(selection).toHaveBeenCalledWith(0, 1);
    await fireEvent.changeText(input, '6');
    await fireEvent.changeText(input, '65');
    expect(screen.getByLabelText('Quantity').props.value).toBe('65');
    expect(selection).toHaveBeenCalledTimes(1);
    selection.mockRestore();
  });

  it('steps the value up when + is pressed', async () => {
    const onChange = jest.fn();
    const user = userEvent.setup();
    await render(<Stepper value={2} onChange={onChange} />);

    await user.press(screen.getByRole('button', { name: 'Increase' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('removes rather than stepping below the floor when − is pressed at min', async () => {
    const onChange = jest.fn();
    const onRemove = jest.fn();
    const user = userEvent.setup();
    await render(<Stepper value={1} min={1} onChange={onChange} onRemove={onRemove} />);

    // At the floor with an onRemove, the − control is labelled "Remove".
    await user.press(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});
