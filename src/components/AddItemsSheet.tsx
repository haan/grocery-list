import React, { useCallback, useMemo } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import { useReducedMotion } from './Dialogs';
import ItemPicker from './ItemPicker';
import { useListsStore } from '../store/lists';
import { visibleItems } from '../data/list';
import { t, pickLocale, getLocale, CANONICAL_LOCALES } from '../i18n';
import { useLocalePreference } from '../i18n/localePreference';
import {
  useTheme,
  fontFamily,
  space,
  target,
  type as ty,
  type Colors,
} from '../theme';

interface Props {
  visible: boolean;
  listId: string;
  onClose: () => void;
}

export default function AddItemsSheet({ visible, listId, onClose }: Props) {
  const { c } = useTheme();
  const s = makeStyles(c);
  const reduced = useReducedMotion();

  const list = useListsStore((st) => st.lists.find((l) => l.id === listId));
  const addItem = useListsStore((st) => st.addItem);

  const { pref } = useLocalePreference();
  const activeLocale =
    pref === 'system'
      ? pickLocale(getLocale(), [...CANONICAL_LOCALES]) ?? 'en'
      : pref;

  const activeNames = useMemo(
    () =>
      new Set((list ? visibleItems(list) : []).map((it) => it.name.toLowerCase())),
    [list]
  );

  const onAdd = useCallback(
    (name: string, category?: Parameters<typeof addItem>[3]) => {
      addItem(listId, name, activeLocale, category);
    },
    [addItem, listId, activeLocale]
  );

  return (
    <Modal
      visible={visible}
      animationType={reduced ? 'none' : 'slide'}
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SafeAreaView style={s.safe} edges={['top', 'bottom', 'left', 'right']}>
          <View style={s.topBar}>
            <Text style={s.title} accessibilityRole="header">
              {t('detail.addItemsTitle')}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              testID="addSheetDone"
              accessibilityRole="button"
              accessibilityLabel={t('common.done')}
              style={({ pressed }) => [s.doneBtn, pressed && s.pressed]}
            >
              <Text style={s.doneText}>{t('common.done')}</Text>
            </Pressable>
          </View>

          <ItemPicker
            activeNames={activeNames}
            onAdd={onAdd}
            onClose={onClose}
            presentLabel={t('detail.onList')}
            presentA11y={(name) => t('detail.onListItemA11y', { name })}
            addHint={t('detail.addItemHint')}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.bg },
    pressed: { opacity: 0.6 },

    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.s6,
      paddingTop: space.s3,
      paddingBottom: space.s3,
    },
    title: {
      ...ty.md,
      fontFamily: fontFamily.sansSemibold,
      color: c.fg,
    },
    doneBtn: {
      minHeight: target.min,
      justifyContent: 'center',
      paddingLeft: space.s4,
    },
    doneText: {
      ...ty.base,
      fontFamily: fontFamily.sansSemibold,
      color: c.accent,
    },

  });
}
