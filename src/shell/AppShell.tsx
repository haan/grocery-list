/** Android app shell: navigation, theme, diagnostics, safe areas, and splash. */

import React, { useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  NavigationContainer,
  type NavigationContainerRef,
  type NavigationState,
  type PartialState,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ErrorBoundary } from '../components/ErrorBoundary';
import AnimatedSplash from '../components/AnimatedSplash';
import { FeedbackProvider } from '../feedback/FeedbackProvider';
import { buildNavTheme } from './navTheme';
import { useApplyThemePreference } from '../theme';
import { useApplyLocalePreference, useLocaleVersion } from '../i18n/localePreference';
import { logEvent, logNav } from '../feedback/log';

/**
 * The name of the screen the user is actually looking at, walking down through
 * nested navigators. Route NAMES only — params are never read, because params
 * routinely carry user content (a list name, an item id) and the diagnostic log
 * is content-free by contract (feedback/log.ts § PRIVACY CONTRACT).
 */
function activeRouteName(
  state: NavigationState | PartialState<NavigationState> | undefined
): string | null {
  let node: any = state;
  let name: string | null = null;
  // Bounded walk — a malformed/cyclic state must not spin the JS thread.
  for (let depth = 0; node && depth < 12; depth++) {
    const routes = node.routes;
    if (!Array.isArray(routes) || routes.length === 0) break;
    const route = routes[typeof node.index === 'number' ? node.index : routes.length - 1];
    if (!route) break;
    if (route.name) name = String(route.name);
    node = route.state;
  }
  return name;
}

type Props = {
  /** Content is ready (fonts loaded + stores hydrated). Until true, the splash
   *  holds and the navigator is not mounted. */
  ready: boolean;
  /** The navigator tree (a <Stack.Navigator> with the app's screens). */
  children: React.ReactNode;
  /** Optional navigation ref for deep-linking / share-link pairing. */
  navigationRef?: React.Ref<NavigationContainerRef<any>>;

};

export function AppShell({ ready, children, navigationRef }: Props) {
  // Restore + apply the saved appearance preference (System/Light/Dark) once,
  // before first paint. Drives useColorScheme() below and in every screen.
  useApplyThemePreference();
  // Restore + apply the saved language (System, or a locale the user chose). The
  // version keys <NavigationContainer> below so an explicit switch re-renders the
  // whole tree in the new language (canon § Translations). System needs no
  // remount — the device locale is applied on i18n import.
  useApplyLocalePreference();
  const localeVersion = useLocaleVersion();
  const isDark = useColorScheme() === 'dark';
  const [splashDone, setSplashDone] = useState(false);

  // ---- Breadcrumbs (feedback/log.ts) --------------------------------------
  // A bug report is only triageable if it says what the app was doing. The shell
  // is the one place that sees every screen change, so it owns the trail; screens
  // and stores add their own domain events on top. Route NAMES only.
  const lastRoute = useRef<string | null>(null);
  const readyLogged = useRef(false);
  useEffect(() => {
    if (!ready || readyLogged.current) return;
    readyLogged.current = true;
    logEvent('app', 'ready', { theme: isDark ? 'dark' : 'light' });
  }, [ready, isDark]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          {ready && (
            <NavigationContainer
              key={localeVersion}
              ref={navigationRef}
              theme={buildNavTheme(isDark)}
              onStateChange={(state) => {
                const name = activeRouteName(state);
                if (name && name !== lastRoute.current) {
                  lastRoute.current = name;
                  logNav(name);
                }
              }}
            >
              <StatusBar style={isDark ? 'light' : 'dark'} />
              <FeedbackProvider>{children}</FeedbackProvider>
            </NavigationContainer>
          )}
          {!splashDone && (
            <AnimatedSplash ready={ready} onFinish={() => setSplashDone(true)} />
          )}
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
