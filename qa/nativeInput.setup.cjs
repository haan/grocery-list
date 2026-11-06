// RN 0.86 exposes TextInput.setSelection, but its Jest preset omits this command.
// Mock only the native boundary; prompt selection timing stays real in tests.
const { TextInput } = require('react-native');
TextInput.prototype.setSelection = jest.fn();
