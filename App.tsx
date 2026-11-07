/** Shopping-list navigation, hydration, background persistence, and sharing. */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, AppState, View, Text, Button } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { t } from './src/i18n';
import { useAppFonts, useTheme } from './src/theme';
import { AppShell } from './src/shell/AppShell';
import { useListsStore } from './src/store/lists';
import { useAccountStore } from './src/store/account';
import ListsHomeScreen from './src/screens/ListsHomeScreen';
import ReorderAislesScreen from './src/screens/ReorderAislesScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import ShareScreen from './src/screens/ShareScreen';
import { startSyncEngine, stopSyncEngine, flushSyncEngine } from './src/sync';
import { parseShareLink } from './src/sync/share';

// Hold Android's launch screen only until the app content or startup error is ready.
SplashScreen.preventAutoHideAsync().catch(() => {});

export type RootStackParamList = {
  Lists: undefined;
  ReorderAisles: { listId: string };
  Settings: undefined;
  Share: { joinSecret?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const navigationRef = createNavigationContainerRef<RootStackParamList>();

export default function App() {
  const [fontsLoaded] = useAppFonts();
  const hydrated = useListsStore((s) => s.hydrated);
  const hydrate = useListsStore((s) => s.hydrate);
  const accountHydrated = useAccountStore((s) => s.hydrated);
  const hydrateAccount = useAccountStore((s) => s.hydrate);

  const [failed, setFailed] = useState(false);
  const initialize = useCallback(async () => {
    setFailed(false);
    try { await hydrate(); await hydrateAccount(); }
    catch { setFailed(true); }
  }, [hydrate, hydrateAccount]);
  useEffect(() => { void initialize(); }, [initialize]);
  const queuedLink = useRef<string | null>(null);
  const openQueuedLink = useCallback(() => {
    if (!navigationRef.isReady() || !useListsStore.getState().hydrated || !useAccountStore.getState().hydrated) return;
    const secret = queuedLink.current;
    if (!secret) return;
    queuedLink.current = null;
    if (useListsStore.getState().lists[0]?.shareIdentity?.secret !== secret)
      navigationRef.navigate('Share', { joinSecret: secret });
  }, []);

  // Sync engine: start once the local store is ready, stop on teardown.
  useEffect(() => {
    if (!hydrated || !accountHydrated || failed) return;
    startSyncEngine();
    return () => stopSyncEngine();
  }, [hydrated, accountHydrated, failed]);

  // On the way to the background, durably flush local state and push the latest
  // copy to peers immediately. Without this, a check made just before switching
  // apps can be lost (fire-and-forget save not yet landed) or never published
  // (the 700ms publish debounce is suspended mid-wait). Fires on 'inactive'
  // (when reported) or 'background', before the OS suspends the app.
  useEffect(() => {
    if (!hydrated) return;
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'inactive' || next === 'background') {
        flushSyncEngine();
        useListsStore.getState().flushPending();
      }
    });
    return () => sub.remove();
  }, [hydrated]);

  // Pairing via a tapped share link: join the shared list, open it.
  useEffect(() => {
    const handle = (url: string | null) => {
      const secret = url ? parseShareLink(url) : null;
      if (!secret) return;
      queuedLink.current = secret;
      openQueuedLink();
    };
    Linking.getInitialURL()
      .then(handle)
      .catch(() => {});
    const sub = Linking.addEventListener('url', (e) => handle(e.url));
    return () => sub.remove();
  }, [openQueuedLink]);

  // Content is ready once fonts AND every store has hydrated (so a populated
  // database doesn't flash an empty "no lists yet" state on launch).

  const ready = fontsLoaded && hydrated && accountHydrated;

  return (
    <AppShell ready={ready || failed} navigationRef={navigationRef} onReady={openQueuedLink}>
      {failed ? <StartupError retry={initialize} /> :
      <Stack.Navigator
        initialRouteName="Lists"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Lists" component={ListsHomeScreen} />
        <Stack.Screen
          name="ReorderAisles"
          component={ReorderAislesScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen
          name="Share"
          component={ShareScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>}
    </AppShell>
  );
}

function StartupError({ retry }: { retry: () => Promise<void> }) {
  const { c } = useTheme();
  return <View style={{ flex:1, backgroundColor:c.bg, justifyContent:'center', padding:32 }}>
    <Text style={{ color:c.fg, marginBottom:24 }}>{t('error.loadData')}</Text>
    <Button title={t('error.retry')} onPress={() => { void retry(); }} />
  </View>;
}
