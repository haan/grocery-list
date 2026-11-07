import React, { useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { applicationId } from 'expo-application';
import * as Updates from 'expo-updates';
import { t } from '../i18n';
import { useTheme, fontFamily, space, target, type as ty } from '../theme';
import { useListsStore } from '../store/lists';
import { saveList } from '../store/db';
import { flushSyncEngine } from '../sync';

export function UpdateSetting() {
  const { c } = useTheme();
  const enabled = applicationId === 'io.github.haan.grocerylist'
    && Updates.isEnabled && Updates.channel === 'production';
  return <View style={s.section}>
    <Text style={[s.title, { color: c.fgMuted }]} accessibilityRole="header">{t('updates.title')}</Text>
    {enabled ? <EverydayUpdates /> : <Text style={[s.text, { color: c.fgMuted }]}>{t('updates.dev')}</Text>}
  </View>;
}

function EverydayUpdates() {
  const { c } = useTheme();
  const updates = Updates.useUpdates();
  const [phase, setPhase] = useState<'idle' | 'checking' | 'downloading' | 'restarting'>('idle');
  const [result, setResult] = useState<'current' | 'error' | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const lock = useRef(false);
  const blocked = useListsStore(st => !!(st.pendingJoin || st.transitioning));
  const pending = updates.isUpdatePending || downloaded;
  const busy = phase !== 'idle' || updates.isChecking || updates.isDownloading
    || updates.isRestarting || updates.isStartupProcedureRunning;

  const act = async () => {
    if (lock.current || busy || (pending && blocked)) return;
    lock.current = true;
    setResult(null);
    try {
      if (pending) {
        setPhase('restarting');
        const state = useListsStore.getState();
        if (state.pendingJoin || state.transitioning) throw new Error('List transition in progress');
        await state.flushPending();
        // Unlike the best-effort background flush, do not restart after a failed write.
        await Promise.all(useListsStore.getState().lists.map(list => saveList(list)));
        if (useListsStore.getState().pendingJoin || useListsStore.getState().transitioning) {
          throw new Error('List transition in progress');
        }
        flushSyncEngine();
        await Updates.reloadAsync();
      } else {
        setPhase('checking');
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable || check.isRollBackToEmbedded) {
          setPhase('downloading');
          const fetched = await Updates.fetchUpdateAsync();
          setDownloaded(fetched.isNew || fetched.isRollBackToEmbedded);
          if (!fetched.isNew && !fetched.isRollBackToEmbedded) setResult('current');
        } else setResult('current');
      }
    } catch {
      setResult('error');
    } finally {
      lock.current = false;
      setPhase('idle');
    }
  };

  const status = phase === 'restarting' || updates.isRestarting ? 'restarting'
    : phase === 'downloading' || updates.isDownloading ? 'downloading'
    : busy ? 'checking'
    : result === 'error' || (!result && !pending && (updates.checkError || updates.downloadError)) ? 'error'
    : pending ? 'ready'
    : result === 'current' ? 'current' : 'automatic';
  const disabled = busy || (pending && blocked);
  return <>
    <Text style={[s.text, { color: c.fgMuted }]} accessibilityLiveRegion="polite">{t(`updates.${status}`)}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={() => { void act(); }}
      style={({ pressed }) => [s.button, { borderColor: c.hairline }, (pressed || disabled) && s.dim]}>
      <Text style={[s.buttonText, { color: c.fg }]}>{t(pending ? 'updates.restart' : 'updates.check')}</Text>
    </Pressable>
    {!updates.currentlyRunning.isEmbeddedLaunch && updates.currentlyRunning.updateId &&
      <Text style={[s.revision, { color: c.fgMuted }]}>{t('updates.revision', { id: updates.currentlyRunning.updateId.slice(0, 8) })}</Text>}
  </>;
}

const s = StyleSheet.create({
  section: { paddingHorizontal: space.s6, paddingTop: space.s7, gap: space.s3 },
  title: { ...ty.xs, fontFamily: fontFamily.sansSemibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  text: { ...ty.sm, fontFamily: fontFamily.sans },
  button: { minHeight: target.min, borderWidth: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center', padding: space.s3 },
  buttonText: { ...ty.base, fontFamily: fontFamily.sansSemibold },
  revision: { ...ty.xs, fontFamily: fontFamily.mono },
  dim: { opacity: 0.5 },
});
