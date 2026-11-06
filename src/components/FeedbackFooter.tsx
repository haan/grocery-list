/** Feedback action and the app wordmark at the end of the list. */

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  type SharedValue,
} from 'react-native-reanimated';
import { Mail } from 'lucide-react-native';
import { useFeedback } from '../feedback/FeedbackProvider';
import { Wordmark } from './Wordmark';
import { t } from '../i18n';
import {
  useTheme,
  fontFamily,
  space,
  target,
  radius,
  hairline,
  type as ty,
  type Colors,
} from '../theme';

type Props = {
  /** 0→1 progress of the bottom-overscroll pull (from usePullRevealFooter). At
   *  0 the wordmark is hidden; at 1 it has fully popped in. */
  reveal?: SharedValue<number>;
  /** When true the wordmark is hidden at rest and pops in on pull (the splash
   *  pop, echoed at the foot of the screen). When false it is statically shown
   *  — the reduced-motion fallback. */
  pullToReveal?: boolean;
};

export function FeedbackFooter({ reveal, pullToReveal }: Props = {}) {
  const { c } = useTheme();
  const s = makeStyles(c);
  const { open: openFeedback } = useFeedback();

  // The exact splash pop, re-keyed to the pull instead of a timeline: opacity +
  // a small rise (14→0) + a scale-settle (0.85→1), the single ease-out curve.
  const revealStyle = useAnimatedStyle(() => {
    const p = reveal ? reveal.value : 0;
    return {
      opacity: p,
      transform: [
        { translateY: interpolate(p, [0, 1], [14, 0]) },
        { scale: interpolate(p, [0, 1], [0.85, 1]) },
      ],
    };
  });

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <Pressable
          style={({ pressed }) => [s.btn, pressed && s.pressed]}
          onPress={() => openFeedback()}
          accessibilityRole="button"
          accessibilityLabel={t('about.feedback')}
        >
          <Mail size={16} color={c.fg} strokeWidth={1.5} />
          <Text style={s.btnText} numberOfLines={1}>
            {t('about.feedback')}
          </Text>
        </Pressable>
      </View>
      {pullToReveal ? (
        <Animated.View style={[s.lockup, revealStyle]}>
          <Wordmark />
        </Animated.View>
      ) : (
        <View style={s.lockup}>
          <Wordmark />
        </View>
      )}
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      gap: space.s4,
      paddingTop: space.s5,
      paddingBottom: space.s6,
      paddingHorizontal: space.s5,
    },
    // Two equal-width ghost buttons.
    row: {
      flexDirection: 'row',
      alignSelf: 'stretch',
      gap: space.s4,
    },
    // Ghost / secondary CTA — hairline border, no fill, ink label.
    btn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.s2,
      minHeight: target.min,
      paddingVertical: space.s2,
      paddingHorizontal: space.s4,
      borderRadius: radius.md,
      borderWidth: hairline,
      borderColor: c.hairlineStrong,
    },
    btnText: {
      ...ty.sm,
      fontFamily: fontFamily.sansMedium,
      color: c.fg,
      // Shrink the label's box (not its font) so two buttons hold their row down

      // while the full "Support this app" / "Send feedback" stays on the a11y
      // label. (Was adjustsFontSizeToFit + minimumFontScale — an unbounded-width
      // Text in a flex row is the RN footgun that shrank this to ~9pt at default
      // type; fixed 2026-07-15.)
      flexShrink: 1,
      textAlign: 'center',
    },
    // Tight, deliberate ~14pt below the buttons (wrap gap space.s4 + this) — the
    // wordmark springs into this gap on pull rather than sitting far beneath.
    lockup: {
      paddingTop: space.s1,
    },
    pressed: { opacity: 0.6 },
  });
}
