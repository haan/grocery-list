/** Android simultaneous pan gesture for the feedback footer; respects reduced motion. */

import { useCallback, useMemo, useState } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  Gesture,
  type ComposedGesture,
  type PanGesture,
} from 'react-native-gesture-handler';
import {
  Easing,
  useReducedMotion,
  useSharedValue,
  useAnimatedScrollHandler,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';


// read off the resisted native bounce).
const REVEAL_DISTANCE = 88;
// Android: raw finger travel past the bottom is unresisted, so we apply our own
// rubber-band. RESIST_SCALE sets how far you pull before fully revealed — at
// 2.2 you drag ~190px of finger for the last of the reveal, matching the feel

const RESIST_SCALE = 2.2;
// Ignore sub-finger jitter before treating a drag as an over-pull.
const PULL_SLOP = 6;
// You're "at the bottom" within this many px of the content's end.
const BOTTOM_EPS = 2;
// Single ease-out curve (design-system motion.easingStandard) — matches the
// splash pop; the wordmark recedes on the same curve it arrived on.
const RELEASE = { duration: 320, easing: Easing.bezier(0.2, 0, 0, 1) };

export type PullRevealFooter = {
  /** True when the pull-to-reveal pop should play (both platforms); false under
   *  reduced-motion, where FeedbackFooter shows the wordmark statically. */
  pullToReveal: boolean;
  /** 0→1 reveal progress; pass to <FeedbackFooter reveal=… />. */
  reveal: SharedValue<number>;

  gesture: ComposedGesture;
  /** The same over-pull as a Pan a list adopts as its own (ReorderableList). */
  listPanGesture: PanGesture;

  onScroll: ReturnType<typeof useAnimatedScrollHandler>;
  /** Plain onScroll callback — use on a stock RN scroll component (SectionList /
   *  FlatList / ScrollView) when wrapping it in Animated.* is awkward; needs
   *  scrollEventThrottle={16}. */
  onScrollJS: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** onLayout for the scroll component — its height is the scroll viewport, used
   *  to tell a short (non-scrollable) list from a scrollable one. */
  onScrollViewLayout: (e: LayoutChangeEvent) => void;
  /** onContentSizeChange for the scroll component — feeds at-bottom detection so
   *  the pull engages on a short list that never fires onScroll. */
  onContentSizeChange: (w: number, h: number) => void;
  /** Measured footer height — offset a floating action button by this. */
  footerHeight: number;
  /** onLayout for the footer holder; feeds footerHeight. */
  onFooterLayout: (e: LayoutChangeEvent) => void;
};

export function usePullRevealFooter(): PullRevealFooter {
  const reduceMotion = useReducedMotion();
  const pullToReveal = !reduceMotion;
  const androidPull = pullToReveal;

  const reveal = useSharedValue(0);
  // Raw metrics as plain numbers (not a derived boolean) — the pan worklet
  // decides at-bottom from these live on the UI thread, so there's no
  // cross-thread boolean to go stale. `scrollOver` = last value of
  // (offset + viewport − content): 0 at the bottom, negative above it, and far
  // negative until the first scroll (so a scrollable list reads "not at bottom"
  // at the top). content/viewport feed the short-list (non-scrollable) case.
  const scrollOver = useSharedValue(-1e7);
  const contentH = useSharedValue(0);
  const viewportH = useSharedValue(0);
  // translationY captured when the drag first reaches the bottom, so the reveal
  // measures only the drag PAST the bottom (not the scroll that got us there).
  const anchorY = useSharedValue(-1);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      const over =
        e.contentOffset.y + e.layoutMeasurement.height - e.contentSize.height;
      scrollOver.value = over;

    },
  });

  const onScrollJS = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
      const over =
        contentOffset.y + layoutMeasurement.height - contentSize.height;
      scrollOver.value = over;

    },
    [reveal, scrollOver]
  );

  const onScrollViewLayout = useCallback(
    (e: LayoutChangeEvent) => {
      viewportH.value = e.nativeEvent.layout.height;
    },
    [viewportH]
  );
  const onContentSizeChange = useCallback(
    (_w: number, h: number) => {
      contentH.value = h;
    },
    [contentH]
  );

  // Feed a finger's vertical travel (down = positive) into the reveal. At-bottom
  // is decided live on the UI thread: a short (non-scrollable) list always is;
  // a scrollable one only when the last scroll-over reached the edge.
  const pullTo = (translationY: number) => {
    'worklet';
    const scrollable = contentH.value > viewportH.value + BOTTOM_EPS;
    const atBottom = !scrollable || scrollOver.value >= -BOTTOM_EPS;
    if (!atBottom) {
      anchorY.value = -1;
      reveal.value = 0;
      return;
    }
    if (anchorY.value < 0) anchorY.value = translationY;
    const d = anchorY.value - translationY - PULL_SLOP;
    if (d <= 0) {
      reveal.value = 0;
      return;
    }

    const resisted = d / (1 + d / (REVEAL_DISTANCE * RESIST_SCALE));
    const p = resisted / REVEAL_DISTANCE;
    reveal.value = p > 1 ? 1 : p;
  };
  const releasePull = () => {
    'worklet';
    anchorY.value = -1;
    reveal.value = withTiming(0, RELEASE);
  };

  // The pan recognises simultaneously with the scroll view's own gesture, so
  // normal scrolling is untouched; the pan only feeds `reveal` while at bottom.
  const gesture = Gesture.Simultaneous(
    Gesture.Native(),
    Gesture.Pan()
      .enabled(androidPull)
      .onBegin(() => {
        anchorY.value = -1;
      })
      .onUpdate((e) => pullTo(e.translationY))
      .onFinalize(() => releasePull())
  );

  // For a list that owns its scroll gesture: a Pan it adopts as its own (touch
  // callbacks fire whether or not it activates; the list never replaces them).
  // `startY` is null between touches — an ending pan can emit a stray move and
  // an up with numberOfTouches < 0 after cancelling its pointers.
  const startY = useSharedValue<number | null>(null);
  const listPanGesture = useMemo(
    () =>
      Gesture.Pan()
        .onTouchesDown((e) => {
          const touch = e.allTouches[0];
          if (!androidPull || e.numberOfTouches !== 1 || !touch) return;
          startY.value = touch.absoluteY;
          anchorY.value = -1;
        })
        .onTouchesMove((e) => {
          const touch = e.allTouches[0];
          if (!androidPull || !touch || startY.value === null) return;
          pullTo(touch.absoluteY - startY.value);
        })
        .onTouchesUp((e) => {
          if (!androidPull || e.numberOfTouches > 0) return;
          startY.value = null;
          releasePull();
        })
        .onTouchesCancelled(() => {
          if (!androidPull) return;
          startY.value = null;
          releasePull();
        }),
    // Shared values are stable; recreate only when the gate flips.
    [androidPull]
  );

  const [footerHeight, setFooterHeight] = useState(96);
  const onFooterLayout = useCallback(
    (e: LayoutChangeEvent) =>
      setFooterHeight(Math.round(e.nativeEvent.layout.height)),
    []
  );

  return {
    pullToReveal,
    reveal,
    gesture,
    listPanGesture,
    onScroll,
    onScrollJS,
    onScrollViewLayout,
    onContentSizeChange,
    footerHeight,
    onFooterLayout,
  };
}
