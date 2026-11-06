// Canonical Josh Approved layout primitives.

import type { ViewStyle } from 'react-native';


export const CONTENT_MAX_WIDTH = 640;

/**
 * Style fragment: cap an element to {@link CONTENT_MAX_WIDTH} and center it
 * within its parent. Spread into the style keys for the surfaces above:
 *
 *     header: { ...boundedContent, paddingHorizontal: space.s5, ... }
 *
 * Works on plain Views and on `contentContainerStyle` of a vertical
 * ScrollView / FlatList. No JSX changes required.
 */
export const boundedContent: ViewStyle = {
  width: '100%',
  maxWidth: CONTENT_MAX_WIDTH,
  alignSelf: 'center',
};
