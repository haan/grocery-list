import { applyAisleDrop } from '../aisleOrder';

test('moves just the dragged aisle in either direction', () => {
  expect(applyAisleDrop(['a','b','c'], 'a', ['b','c','a'])).toEqual(['b','c','a']);
  expect(applyAisleDrop(['a','b','c'], 'c', ['c','a','b'])).toEqual(['c','a','b']);
});

test('preserves concurrent additions and does not resurrect deleted or renamed aisles', () => {
  expect(applyAisleDrop(['a','new','b','c'], 'a', ['b','a','c'])).toEqual(['new','b','a','c']);
  expect(applyAisleDrop(['a','c'], 'a', ['b','a','c'])).toEqual(['a','c']);
  const renamed = ['renamed','b','c'];
  expect(applyAisleDrop(renamed, 'a', ['b','a','c'])).toBe(renamed);
});
