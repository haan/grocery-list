import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Check } from 'lucide-react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { lightColors, fontFamily, tracking } from '../theme';

const PAPER = lightColors.bg; // #FAFAF7 — matches the native launch screen
const GREEN = lightColors.accent; // #1F8A4C — the approval green (the check)
const INK = lightColors.fg; // wordmark text

// Single ease-out curve (design-system `motion.easingStandard`). No bounce.
const EASE = Easing.bezier(0.2, 0, 0, 1);

// Timeline (ms) — ~1s total, deliberately unhurried but crisp.
const T = {
  holdBefore: 240, // icon alone (after its font is ready) before the mark
  wordIn: 380, // the wordmark pops in (fade + rise + scale-settle)
  holdAfter: 160, // let the finished mark sit a beat
  fadeOut: 240, // crossfade the whole layer into the app
};
// Don't wait on the (bundled, fast) wordmark font forever — proceed after this.
const FONT_FALLBACK_MS = 900;

const { width: WIN_W, height: WIN_H } = Dimensions.get('window');
// The native launch screen shows the glyph contained full-screen; render it the
// same way (centred square the size of the shorter edge) so the handoff matches.
const ICON = Math.round(Math.min(WIN_W, WIN_H));
// The wordmark sits in the lower portion of the screen, beneath the icon.
const WORDMARK_BOTTOM = Math.round(WIN_H * 0.16);
const CHECK_SIZE = 22;
// Trailing room so the final glyph's ink can NEVER be clipped. The wordmark uses

// text frame to just inside where the last glyph ("d" of "approved") actually

// Extra trailing space prevents clipping while the wordmark is transformed.
const WORDMARK_TRAILING_PAD = 6;

type Props = {
  /** App content is mounted and ready (fonts + stores hydrated). */
  ready: boolean;
  /** Called once the layer has fully faded out — unmount the splash then. */
  onFinish: () => void;
};

export default function AnimatedSplash({ ready, onFinish }: Props) {
  const reduceMotion = useReducedMotion();
  // Load the wordmark's font here so the mark renders in IBM Plex from the
  // first frame it appears — identical on every app (see file header).
  const [markFontLoaded] = useFonts({
    'IBMPlexSans-SemiBold': require('../../assets/fonts/IBMPlexSans-SemiBold.otf'),
  });

  const wordOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const wordScale = useSharedValue(reduceMotion ? 1 : 0.85);
  const wordY = useSharedValue(reduceMotion ? 0 : 14);
  const layerOpacity = useSharedValue(1);

  const [introDone, setIntroDone] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const [fontTimedOut, setFontTimedOut] = useState(false);
  const began = useRef(false);
  const hid = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Fallback so the wordmark — and therefore the splash exit — never waits
  // forever on the bundled font.
  useEffect(() => {
    const id = setTimeout(() => setFontTimedOut(true), FONT_FALLBACK_MS);
    return () => clearTimeout(id);
  }, []);

  // Hand the native launch screen over to the JS layer the moment it's on
  // screen (the two frames are identical, so no flicker).
  const onLayout = () => {
    if (hid.current) return;
    hid.current = true;
    SplashScreen.hideAsync().catch(() => {});
    setLaidOut(true);
  };

  // Start the intro once the layer is up AND the wordmark font is ready (or the
  // fallback fired). Gating on font-readiness is what makes the mark identical
  // across apps. introDone is time-based from here, so the splash always exits.
  useEffect(() => {
    if (began.current || !laidOut) return;
    if (!markFontLoaded && !fontTimedOut) return;
    began.current = true;

    if (reduceMotion) {
      setIntroDone(true);
      return;
    }
    const opts = { duration: T.wordIn, easing: EASE };
    wordOpacity.value = withDelay(T.holdBefore, withTiming(1, opts));
    wordScale.value = withDelay(T.holdBefore, withTiming(1, opts));
    wordY.value = withDelay(T.holdBefore, withTiming(0, opts));
    const id = setTimeout(
      () => setIntroDone(true),
      T.holdBefore + T.wordIn + T.holdAfter,
    );
    timers.current.push(id);
  }, [laidOut, markFontLoaded, fontTimedOut, reduceMotion, wordOpacity, wordScale, wordY]);

  // Exit once the intro has played AND the app behind us is ready.
  useEffect(() => {
    if (!introDone || !ready) return;
    layerOpacity.value = withTiming(
      0,
      { duration: reduceMotion ? 0 : T.fadeOut, easing: EASE },
      (finished) => {
        if (finished) runOnJS(onFinish)();
      },
    );
  }, [introDone, ready, reduceMotion, layerOpacity, onFinish]);

  const layerStyle = useAnimatedStyle(() => ({ opacity: layerOpacity.value }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordY.value }, { scale: wordScale.value }],
  }));

  return (
    <Animated.View style={[styles.layer, layerStyle]} onLayout={onLayout}>
      <StatusBar style="dark" />
      <View style={styles.center}>
        <Image
          source={require('../../assets/splash-icon.png')}
          style={{ width: ICON, height: ICON }}
          resizeMode="contain"
          fadeDuration={0}
        />
      </View>
      <View style={styles.wordmarkWrap}>
        <Animated.View
          style={[styles.row, wordStyle]}
          accessible
          accessibilityRole="text"
          accessibilityLabel="josh approved"
        >
          <Check size={CHECK_SIZE} color={GREEN} strokeWidth={3} />
          <Text style={styles.text} importantForAccessibility="no">
            josh approved
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

// Explicit absolute-fill literal — version-safe across React Native releases.
// RN 0.85 dropped `StyleSheet.absoluteFillObject` from its types (the New
// Architecture made `absoluteFill` the object), so spelling it out keeps the
// canonical splash compiling on every SDK the catalogue spans.
const ABSOLUTE_FILL = {
  position: 'absolute' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const styles = StyleSheet.create({
  layer: {
    ...ABSOLUTE_FILL,
    backgroundColor: PAPER,
    zIndex: 10,
    elevation: 10,
    pointerEvents: 'none',
  },
  center: {
    ...ABSOLUTE_FILL,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  wordmarkWrap: {
    ...ABSOLUTE_FILL,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: WORDMARK_BOTTOM,
    pointerEvents: 'none',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: {
    color: INK,
    fontFamily: fontFamily.sansSemibold,
    fontSize: 19,
    letterSpacing: tracking.mark,
    // See WORDMARK_TRAILING_PAD: keeps the trailing "d" off the clip boundary of
    // the animated/transformed layer. paddingRight only — the leading "j" never
    // clips, so the check↔text gap stays exactly `row.gap`.
    paddingRight: WORDMARK_TRAILING_PAD,
  },
});
