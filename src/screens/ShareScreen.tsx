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
  const action = (label: string, onPress: () => void, variant: 'primary' | 'secondary' | 'danger' = 'secondary') => <Pressable
    accessibilityRole="button" accessibilityLabel={label} disabled={busy} accessibilityState={{ disabled: busy }}
    onPress={onPress} style={({ pressed }) => [variant === 'primary' ? s.primaryBtn : variant === 'danger' ? s.dangerBtn : s.secondaryBtn, (pressed || busy) && s.pressed]}>
    <Text style={variant === 'primary' ? s.primaryText : variant === 'danger' ? s.dangerText : s.secondaryText}>{label}</Text>
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
      {secret ? <>
        <SyncStatusBar secret={secret} disabled={busy} />
        {pending ? <Text style={s.lead}>{t('share.waiting')}</Text> : <View style={s.inviteSection}>
          <Text style={s.sectionTitle} accessibilityRole="header">{t('share.inviteTitle')}</Text>
          <Text style={s.lead}>{t('share.inviteHelp')}</Text>
          <View style={s.qrCard}><QRCode value={link} size={216} backgroundColor="#FFFFFF" /></View>
          {action(t('share.sendLink'), () => { void Share.share({ message: link }).catch(() => setError(true)); }, 'primary')}
          <Text style={s.accessHint}>{t('share.accessHint')}</Text>
        </View>}
      </> : <View style={s.inviteSection}>
        <Text style={s.sectionTitle} accessibilityRole="header">{t('share.inviteTitle')}</Text>
        <Text style={s.lead}>{t('share.privateHelp')}</Text>
        {action(t('share.start'), () => {
          if (list) { setError(false); void useListsStore.getState().shareList(list.id).catch(() => setError(true)); }
        }, 'primary')}
      </View>}
      <View style={s.joinSection}>
        <Text style={s.sectionTitle} accessibilityRole="header">{t('share.joinTitle')}</Text>
        {action(t('share.scanCode'), () => { void startScan().catch(() => setError(true)); })}
      </View>
      {secret ? action(t('share.stop'), stop, 'danger') : null}
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
    body: { ...boundedContent, paddingTop: space.s3, paddingBottom: space.s7, paddingHorizontal: space.s6, gap: space.s6 },
    inviteSection: { gap: space.s3 },
    joinSection: { borderTopWidth: hairline, borderTopColor: c.hairline, paddingTop: space.s5, gap: space.s3 },
    sectionTitle: { ...ty.base, fontFamily: fontFamily.sansSemibold, color: c.fg },
    accessHint: { ...ty.sm, fontFamily: fontFamily.sans, color: c.fgMuted },
    lead: {
      ...ty.base,
      fontFamily: fontFamily.sans,
      color: c.fgMuted,
      textAlign: 'left',
    },
    qrCard: {
      alignSelf: 'center',
      marginVertical: space.s2,
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
      minHeight: 52,
      paddingVertical: space.s3,
      paddingHorizontal: space.s5,
      backgroundColor: c.inkButton,
      borderRadius: radius.md,
      alignSelf: 'stretch',
    },
    primaryText: {
      ...ty.base,
      fontFamily: fontFamily.sansSemibold,
      color: c.inkButtonText,
      textAlign: 'center',
    },
    secondaryBtn: {
      minHeight: 52, alignItems: 'center', justifyContent: 'center',
      paddingHorizontal: space.s5, paddingVertical: space.s3,
      borderWidth: hairline, borderColor: c.hairlineStrong, borderRadius: radius.md,
    },
    secondaryText: { ...ty.base, fontFamily: fontFamily.sansSemibold, color: c.fg, textAlign: 'center' },
    dangerBtn: { minHeight: target.min, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.s4, paddingVertical: space.s3 },
    dangerText: { ...ty.sm, fontFamily: fontFamily.sansSemibold, color: c.dangerText, textAlign: 'center' },
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
