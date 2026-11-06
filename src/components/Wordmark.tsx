/**
 * Development app identity, used in Settings, the footer, and the splash.
 * Original authorship is retained in LICENSE and the repository credits.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { APP_NAME } from '../lib/links';
import { useTheme, fontFamily, space, tracking, scaledLineHeight, type Colors } from '../theme';

export function Wordmark() {
  const { c } = useTheme();
  const s = makeStyles(c);
  return (
    <View style={s.row} accessibilityRole="image" accessibilityLabel={APP_NAME}>
      <Check size={18} color={c.accent} strokeWidth={3} />
      <Text style={s.text} importantForAccessibility="no">
        {APP_NAME}
      </Text>
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.s2,
    },
    text: {
      // The wordmark keeps its own 16/20 rather than a type step (the lockup's
      // proportions are brand, not body copy) — but the leading still has to
      // grow with the OS text size, or the mark clips at large Dynamic Type.
      fontFamily: fontFamily.sansSemibold,
      fontSize: 16,
      lineHeight: scaledLineHeight(20),
      letterSpacing: tracking.mark,
      color: c.fg,
    },
  });
}
