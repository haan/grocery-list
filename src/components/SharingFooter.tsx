import React from 'react';
import { Pressable, Text } from 'react-native';
import { useListsStore } from '../store/lists';
import { useSyncStatusStore } from '../sync/status';
import { useTheme, fontFamily, target, space } from '../theme';
import { t } from '../i18n';

export function SharingFooter({ onPress }: { onPress: () => void }) {
  const secret = useListsStore(s => s.lists[0]?.shareIdentity?.secret);
  const status = useSyncStatusStore(s => secret ? s.bySecret[secret] : undefined);
  const { c } = useTheme();
  const label = !secret ? t('share.private') : !status ? t('share.connecting')
    : status.publishRejected ? t('detail.sync.trouble')
      : status.connected ? t('detail.sync.connected') : t('detail.sync.offline');
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
    accessibilityHint={t('share.openSettings')}
    style={{ minHeight: target.min, justifyContent: 'center', alignItems: 'center', paddingHorizontal: space.s6 }}>
    <Text style={{ color: c.fgMuted, fontFamily: fontFamily.sans }}>{label}</Text>
  </Pressable>;
}
