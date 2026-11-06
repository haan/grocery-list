import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Share, StyleSheet, ScrollView, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useListsStore } from '../store/lists';
import { buildShareLink, parseShareLink } from '../sync/share';
import { resyncNow } from '../sync';
import { useConfirm } from '../components/Dialogs';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { t } from '../i18n';
import { useTheme, fontFamily, space, radius, target, type as ty, hairline, type Colors, boundedContent } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Share'>;
export default function ShareScreen({ route, navigation }: Props) {
  const { c } = useTheme();
  const s = makeStyles(c);
  const list = useListsStore(st => st.lists[0]);
  const busy = useListsStore(st => st.transitioning);
  const pending = useListsStore(st => st.pendingJoin);
  const [scanning, setScanning] = useState(false);
  const scanConsumed = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState(false);
  const confirm = useConfirm();
  const secret = list?.shareIdentity?.secret;
  const link = secret ? buildShareLink(secret) : '';
  const join = useCallback((incoming: string) => {
    setScanning(false);
    if (incoming === useListsStore.getState().lists[0]?.shareIdentity?.secret) return;
    confirm.open({ title: t('share.replaceTitle'), message: t('share.replaceBody'),
      confirmLabel: t('share.join'), destructive: true,
      onConfirm: () => {
        setError(false);
        void useListsStore.getState().joinShared(incoming).then(() => navigation.popToTop()).catch(() => setError(true));
      },
    });
  }, [confirm.open, navigation]);
  useEffect(() => {
    const incoming = route.params?.joinSecret;
    if (!incoming) return;
    navigation.setParams({ joinSecret: undefined });
    join(incoming);
  }, [route.params?.joinSecret, navigation, join]);
  useEffect(() => {
    if (!scanning) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { setScanning(false); return true; });
    return () => sub.remove();
  }, [scanning]);
  const startScan = async () => {
    if (!permission?.granted && !(await requestPermission()).granted) return;
    scanConsumed.current = false;
    setScanning(true);
  };
  const stop = () => confirm.open({ title: t('share.stop'), message: t('share.stopBody'),
    confirmLabel: t('share.stop'), destructive: true,
    onConfirm: () => { setError(false); void useListsStore.getState().stopSharing().catch(() => setError(true)); },
  });
  const action = (label: string, onPress: () => void, primary = false) => <Pressable
    accessibilityRole="button" accessibilityLabel={label} disabled={busy} accessibilityState={{ disabled: busy }}
    onPress={onPress} style={primary ? s.primaryBtn : s.ghostBtn}>
    <Text style={primary ? s.primaryText : s.ghostText}>{label}</Text>
  </Pressable>;
  return <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
    <View style={s.header}>
      <Text style={s.title}>{scanning ? t('share.scanCode') : t('share.title')}</Text>
      <Pressable onPress={() => scanning ? setScanning(false) : navigation.goBack()}
        accessibilityRole="button" accessibilityLabel={t('common.close')} style={s.iconBtn}>
        <X size={22} color={c.fg} />
      </Pressable>
    </View>
    {scanning ? <View style={s.scanWrap}>
      <CameraView style={s.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => {
          if (scanConsumed.current) return;
          const incoming = parseShareLink(data);
          if (!incoming) return;
          scanConsumed.current = true;
          join(incoming);
        }} />
      <Text style={s.hint}>{t('share.scanHint')}</Text>
    </View> : <ScrollView contentContainerStyle={s.body}>
      {error && <Text style={s.hint} accessibilityRole="alert">{t('share.failed')}</Text>}
      <Text style={s.lead}>{pending ? t('share.waiting') : secret ? t('share.sharedHelp') : t('share.privateHelp')}</Text>
      {secret ? <>
        <SyncStatusBar secret={secret} />
        {action(t('share.syncNow'), () => resyncNow(secret))}
        {!pending && <>
          <View style={s.qrCard}><QRCode value={link} size={216} backgroundColor="#FFFFFF" /></View>
          {action(t('share.sendLink'), () => { void Share.share({ message: link }).catch(() => setError(true)); }, true)}
        </>}
        {action(t('share.stop'), stop)}
      </> : action(t('share.start'), () => {
        if (list) { setError(false); void useListsStore.getState().shareList(list.id).catch(() => setError(true)); }
      }, true)}
      {action(t('share.scanCode'), () => { void startScan().catch(() => setError(true)); })}
    </ScrollView>}
    {confirm.element}
  </SafeAreaView>;
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    pressed: { opacity: 0.6 },
    header: {
      ...boundedContent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.s5,
      paddingVertical: space.s4,
    },
    title: { ...ty.md, fontFamily: fontFamily.sansSemibold, color: c.fg },
    iconBtn: {
      width: target.min,
      height: target.min,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { ...boundedContent, flexGrow: 1, paddingBottom: space.s7, alignItems: 'center', paddingHorizontal: space.s7, gap: space.s6 },
    lead: {
      ...ty.base,
      fontFamily: fontFamily.sans,
      color: c.fgMuted,
      textAlign: 'center',
      marginTop: space.s4,
    },
    leadStrong: { fontFamily: fontFamily.sansSemibold, color: c.fg },
    qrCard: {
      padding: space.s6,
      backgroundColor: '#FFFFFF',
      borderRadius: radius.lg,
      borderWidth: hairline,
      borderColor: c.hairline,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.s3,
      minHeight: target.min,
      paddingHorizontal: space.s7,
      backgroundColor: c.inkButton,
      borderRadius: radius.md,
      alignSelf: 'stretch',
    },
    primaryText: {
      ...ty.base,
      fontFamily: fontFamily.sansSemibold,
      color: c.inkButtonText,
    },
    ghostBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.s3,
      minHeight: target.min,
    },
    ghostText: { ...ty.base, fontFamily: fontFamily.sans, color: c.fg },
    scanWrap: { flex: 1, alignItems: 'center', gap: space.s5 },
    camera: {
      width: '86%',
      aspectRatio: 1,
      borderRadius: radius.lg,
      overflow: 'hidden',
      marginTop: space.s5,
    },
    hint: {
      ...ty.sm,
      fontFamily: fontFamily.sans,
      color: c.fgMuted,
      textAlign: 'center',
    },
  });
}
