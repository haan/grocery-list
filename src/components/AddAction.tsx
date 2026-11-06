import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useTheme, boundedContent, space, radius, target, hairline, fontFamily, type as ty, type Colors } from '../theme';

/** Shared add action for list items and aisle management. */
export function AddAction({ label, onPress, disabled = false }: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const s = styles(c);
  return (
    <View style={s.bar}>
      <Pressable onPress={onPress} disabled={disabled}
        accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
        style={({ pressed }) => [s.button, (pressed || disabled) && s.dimmed]}>
        <Text style={s.label}>{label}</Text>
        <Plus size={20} color={c.accent} strokeWidth={2} />
      </Pressable>
    </View>
  );
}

const styles = (c: Colors) => StyleSheet.create({
  bar: { ...boundedContent, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: space.s6, paddingBottom: space.s4 },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: c.bgElevated, borderWidth: hairline, borderColor: c.hairlineStrong,
    borderRadius: radius.md, paddingHorizontal: space.s5, minHeight: target.min },
  label: { ...ty.base, fontFamily: fontFamily.sans, color: c.fgMuted, flexShrink: 1 },
  dimmed: { opacity: 0.6 },
});
