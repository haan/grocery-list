import { startTransition, useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import { target } from '../theme';

/** Prepare a screenful first, then fill the retained view independently of
 * scrolling or visibility. Schedule the next batch only after the last commits.
 */
export function useQueuedRows(total: number): number {
  const { height } = useWindowDimensions();
  const [capacity, setCapacity] = useState(() => Math.max(12, Math.min(40, Math.ceil(height / target.min) + 2)));
  useEffect(() => {
    if (capacity >= total) return;
    let idle: number | undefined;
    const timer = setTimeout(() => {
      idle = requestIdleCallback(() => {
        startTransition(() => setCapacity(count => Math.min(total, count + 24)));
      }, { timeout: 120 });
    }, 24);
    return () => {
      clearTimeout(timer);
      if (idle !== undefined) cancelIdleCallback(idle);
    };
  }, [capacity, total]);
  return Math.min(capacity, total);
}
