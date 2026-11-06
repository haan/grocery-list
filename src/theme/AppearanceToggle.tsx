import React from 'react';
import { View, Text, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme, type Colors } from './colors';
import { fontFamily, type as ty } from './typography';
import { space, radius, target } from './tokens';
import { useThemePreference, type ThemePref } from './themePreference';

export type AppearanceLabels = {
  /** Used only as the radiogroup's accessibility label (the visible section
   *  heading is owned by the screen, so it matches the app's other sections). */
  title: string;
  system: string;
  light: string;
  dark: string;
};

const DEFAULT_LABELS: AppearanceLabels = {
  title: 'Appearance',
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

const OPTIONS: ThemePref[] = ['system', 'light', 'dark'];

export function AppearanceToggle({
  labels,
  style,
}: {
  labels?: Partial<AppearanceLabels>;
  /** Overrides/extends the row container. Default insets by the canonical
   *  screen gutter; pass `{ paddingHorizontal: 0 }` when the screen already
   *  pads its scroll container so the control aligns with the other rows. */
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const s = makeStyles(c);
  const { pref, setPref } = useThemePreference();
  const L = { ...DEFAULT_LABELS, ...labels };
  const labelFor = (o: ThemePref) => (o === 'system' ? L.system : o === 'light' ? L.light : L.dark);

  return (
    <View style={[s.row, style]} accessibilityRole="radiogroup" accessibilityLabel={L.title}>
      {OPTIONS.map((o) => {
        const active = o === pref;
        return (
          <Pressable
            key={o}
            onPress={() => setPref(o)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={labelFor(o)}
            style={[s.btn, active && s.btnActive]}
          >
            <Text style={[s.text, active && s.textActive]}>{labelFor(o)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: space.s2, paddingHorizontal: space.s6 },
    btn: {
      flex: 1,
      minHeight: target.min,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: space.s3,
      borderRadius: radius.md,
      backgroundColor: c.bgSubtle,
    },
    btnActive: { backgroundColor: c.fg },
    text: { ...ty.sm, fontFamily: fontFamily.sans, color: c.fgMuted },
    textActive: { ...ty.sm, fontFamily: fontFamily.sansSemibold, color: c.bg },
  });
}
