/** Appearance, language, sharing, aisle management, and app version. */

import React from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Share2,
  Menu,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useListsStore } from '../store/lists';
import { AboutRow } from '../components/AboutRow';
import { LanguageSetting } from '../components/LanguageSetting';
import { UpdateSetting } from '../components/UpdateSetting';
import { t } from '../i18n';
import { versionLabel } from '../lib/version';
import {
  useTheme,
  fontFamily,
  space,
  target,
  type as ty,
  type Colors,
  AppearanceToggle,
} from '../theme';
import { boundedContent } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const { c } = useTheme();
  const s = makeStyles(c);
  const list = useListsStore(st => st.lists[0]);
  const blocked = useListsStore(st => st.pendingJoin || st.transitioning);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={s.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
        >
          <ChevronLeft size={24} color={c.fg} strokeWidth={1.5} />
        </Pressable>
        <Text style={s.title}>{t('settings.title')}</Text>
        <View style={s.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.sectionLabel} accessibilityRole="header">{t('settings.appearance')}</Text>
        <AppearanceToggle labels={{
          title: t('settings.appearance'),
          system: t('settings.themeSystem'),
          light: t('settings.themeLight'),
          dark: t('settings.themeDark'),
        }} />

        <Text style={s.sectionLabel} accessibilityRole="header">{t('settings.language')}</Text>
        <LanguageSetting />

        <Text style={s.sectionLabel} accessibilityRole="header">{t('settings.shoppingList')}</Text>
        <AboutRow label={t('share.title')} icon={Share2} onPress={() => navigation.navigate('Share')} />
        {!blocked && list && <AboutRow label={t('detail.reorderAisles')} icon={Menu}
          onPress={() => navigation.navigate('ReorderAisles', { listId: list.id })} />}

        <UpdateSetting />
        <Text style={s.version}>{t('settings.version')}: {versionLabel()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
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
      paddingHorizontal: space.s4,
      paddingVertical: space.s3,
    },
    title: {
      ...ty.md,
      fontFamily: fontFamily.sansSemibold,
      color: c.fg,
    },
    iconBtn: {
      width: target.min,
      height: target.min,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: { ...boundedContent, paddingBottom: space.s9 },
    sectionLabel: {
      ...ty.xs,
      fontFamily: fontFamily.sansSemibold,
      color: c.fgMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      paddingHorizontal: space.s6,
      paddingTop: space.s7,
      paddingBottom: space.s3,
    },
    status: {
      ...ty.sm,
      fontFamily: fontFamily.sans,
      color: c.fgMuted,
      paddingHorizontal: space.s6,
      paddingTop: space.s4,
    },
    version: { ...ty.sm, fontFamily: fontFamily.sans, color: c.fgMuted, paddingHorizontal: space.s6, paddingTop: space.s9 },
  });
}
