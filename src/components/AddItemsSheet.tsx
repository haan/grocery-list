import React, { useCallback, useEffect, useMemo, useState, startTransition } from 'react';
import { View, Text, Pressable, StyleSheet, BackHandler, Keyboard } from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import ItemPicker from './ItemPicker';
import { useListsStore } from '../store/lists';
import { X } from 'lucide-react-native';
import { useItemEditor } from './ItemEditor';
import { Snackbar } from './Snackbar';
import { visibleItems, type GroceryItem } from '../data/list';
import { t } from '../i18n';
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
  const s = useMemo(() => makeStyles(c), [c]);
  const [prepared, setPrepared] = useState(visible);
  // Prepare once after the home screen can paint; retain the native rows even
  // while hidden. Showing this surface must not remount the complete catalog.
  useEffect(() => {
    if (prepared) return;
    if (visible) { setPrepared(true); return; }
    const task = requestIdleCallback(() => startTransition(() => setPrepared(true)));
    return () => cancelIdleCallback(task);
  }, [prepared, visible]);
  const close = useCallback(() => { Keyboard.dismiss(); onClose(); }, [onClose]);
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => subscription.remove();
  }, [visible, close]);
  const presentA11y = useCallback((name: string) => t('detail.onListItemA11y', { name }), []);

  const list = useListsStore((st) => st.lists.find((l) => l.id === listId));
  const editor = useItemEditor();
  const [removed, setRemoved] = useState<GroceryItem | null>(null);
  useEffect(() => {
    if (!visible) { editor.close(); setRemoved(null); }
  }, [visible, editor.close]);
  const activeNames = useMemo(
    () =>
      new Set((list ? visibleItems(list) : []).map((it) => it.name.toLowerCase())),
    [list]
  );

  const onSelect = useCallback((name: string, category: string | undefined, saved: (added: boolean) => void) => {
    editor.open({ listId, name, category, onSave: (_item, added) => saved(added),
      onRemove: item => { useListsStore.getState().deleteItem(listId, item.id); setRemoved(item); } });
  }, [editor.open, listId]);

  if (!prepared) return null;
  return (
    <View testID="addItemsSurface" style={[s.surface, !visible && s.hidden]}
      pointerEvents={visible ? 'auto' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <SafeAreaView style={s.safe} edges={['top', 'bottom', 'left', 'right']}>
          <View style={s.topBar}>
            <Text style={s.title} accessibilityRole="header">
              {t('detail.addItemsTitle')}
            </Text>
            <Pressable
              onPress={close}
              hitSlop={8}
              testID="addSheetClose"
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              style={({ pressed }) => [s.closeBtn, pressed && s.pressed]}
            >
              <X size={22} color={c.fg} />
            </Pressable>
          </View>

          <ItemPicker
            active={visible}
            activeNames={activeNames}
            onSelect={onSelect}
            presentLabel={t('detail.onList')}
            presentA11y={presentA11y}
            addHint={t('detail.addItemHint')}
          />
          <Snackbar visible={!!removed} message={t('detail.removed', { name: removed?.name ?? '' })} durationMs={5000}
            actionLabel={t('common.undo')} onAction={() => {
              if (removed) useListsStore.getState().restoreItems(listId, [removed]); setRemoved(null);
            }} onDismiss={() => setRemoved(null)} />
          {editor.element}
        </SafeAreaView>
      </SafeAreaProvider>
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    surface: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10, backgroundColor: c.bg },
    hidden: { opacity: 0 },
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
    closeBtn: {
      minHeight: target.min,
      justifyContent: 'center',
      paddingLeft: space.s4,
    },

  });
}
