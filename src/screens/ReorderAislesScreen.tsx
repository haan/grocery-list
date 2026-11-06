/** Manage aisles with drag handles and accessible move actions. */

import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Menu, X, Trash2, Pencil } from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useListsStore } from '../store/lists';
import { useConfirm, usePrompt } from '../components/Dialogs';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AddAction } from '../components/AddAction';
import { applyAisleDrop } from '../data/aisleOrder';
import { EmptyState } from '../components/EmptyState';
import {
  categoryLabel,
  isBuiltinCategory,
  type Category,
} from '../data/categories';
import { t } from '../i18n';
import {
  useTheme,
  fontFamily,
  space,
  radius,
  target,
  type as ty,
  hairline,
  type Colors,
} from '../theme';
import { boundedContent } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ReorderAisles'>;

export default function ReorderAislesScreen({ route, navigation }: Props) {
  const { listId } = route.params;
  const { c } = useTheme();
  const s = makeStyles(c);

  const list = useListsStore((st) => st.lists.find((l) => l.id === listId));
  const reorderAisles = useListsStore((st) => st.reorderAisles);
  const removeCategory = useListsStore((st) => st.removeCategory);
  const confirm = useConfirm();
  const prompt = usePrompt();
  const addCategory = useListsStore(st => st.addCategory);
  const renameCategory = useListsStore(st => st.renameCategory);
  const [renameFailed, setRenameFailed] = useState(false);
  const order = list?.categoryOrder ?? [];
  const [dragOrder, setDragOrder] = useState<Category[] | null>(null);
  const finishDrag = ({ data, from, to }: {data: Category[]; from: number; to: number}) => {
    setDragOrder(null);
    const latest = useListsStore.getState().getList(listId)?.categoryOrder;
    if (!latest || from === to || !data[to]) return;
    const next = applyAisleDrop(latest, data[to], data);
    if (next !== latest) reorderAisles(listId, next);
  };
  const rename = (category: Category) => {
    setRenameFailed(false);
    prompt.open({
      title: t('reorder.renameTitle'), initialValue: category, selectAll: true,
      placeholder: t('detail.newAislePlaceholder'), confirmLabel: t('common.save'),
      onSubmit: name => { setRenameFailed(!renameCategory(listId, category, name)); },
    });
  };
  const add = () => prompt.open({
    title: t('reorder.add'), placeholder: t('detail.newAislePlaceholder'),
    confirmLabel: t('common.add'), onSubmit: name => { addCategory(listId, name); },
  });

  const move = useCallback(
    (category: Category, dir: -1 | 1) => {
      const latest = useListsStore.getState().getList(listId)?.categoryOrder;
      if (!latest) return;
      const index = latest.indexOf(category);
      const target = index + dir;
      if (index < 0 || target < 0 || target >= latest.length) return;
      const next = [...latest];
      [next[index], next[target]] = [next[target], next[index]];
      reorderAisles(listId, next);
    },
    [listId, reorderAisles]
  );

  const remove = useCallback(
    (cat: Category) => {
      confirm.open({
        title: t('reorder.removeConfirmTitle'),
        message: t('reorder.removeConfirmBody', { name: categoryLabel(cat), other: categoryLabel('Other') }),
        confirmLabel: t('reorder.removeConfirmLabel'),
        destructive: true,
        onConfirm: () => {
          removeCategory(listId, cat);
        },
      });
    },
    [listId, removeCategory, confirm]
  );

  return (
    <GestureHandlerRootView style={s.flex}>
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={s.header}>
        <Text style={s.title}>{t('reorder.title')}</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('common.done')}
          style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
        >
          <X size={22} color={c.fg} strokeWidth={1.5} />
        </Pressable>
      </View>
      <Text style={s.hint}>{t('reorder.hint')}</Text>
      {renameFailed ? <Text style={[s.hint, { color: c.danger }]} accessibilityRole="alert">
        {t('reorder.renameFailed')}
      </Text> : null}
      <AddAction label={t('reorder.add')} onPress={add} disabled={dragOrder != null} />
      <DraggableFlatList
        data={dragOrder ?? order}
        containerStyle={s.flex}
        onDragBegin={() => setDragOrder([...order])}
        onDragEnd={finishDrag}
        autoscrollThreshold={70}
        autoscrollSpeed={180}
        keyExtractor={(cat) => cat}
        contentContainerStyle={s.listContent}
        ItemSeparatorComponent={() => <View style={s.sep} />}
        ListEmptyComponent={<EmptyState message={t('reorder.empty')} />}
        renderItem={({ item, drag, isActive, getIndex }) => (
          <View style={[s.row, isActive && s.dragging]}>
            <Text style={s.rowText}>{categoryLabel(item)}</Text>
            {!isBuiltinCategory(item) ? (
              <Pressable
                disabled={dragOrder != null}
                onPress={() => rename(item)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('reorder.rename', { name: item })}
                style={({ pressed }) => [s.moveBtn, pressed && s.pressed]}
              >
                <Pencil size={18} color={c.fgMuted} strokeWidth={1.5} />
              </Pressable>
            ) : null}
            {!isBuiltinCategory(item) ? (
              <Pressable
                disabled={dragOrder != null}
                onPress={() => remove(item)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={t('reorder.remove', {
                  name: categoryLabel(item),
                })}
                style={({ pressed }) => [s.moveBtn, pressed && s.pressed]}
              >
                <Trash2 size={18} color={c.danger} strokeWidth={1.5} />
              </Pressable>
            ) : null}
            <Pressable onPressIn={drag} disabled={isActive}
              accessibilityRole="adjustable"
              accessibilityLabel={t('reorder.drag', { name: categoryLabel(item) })}
              accessibilityHint={t('reorder.dragHint')}
              accessibilityActions={[
                ...((getIndex() ?? 0) > 0 ? [{ name: 'decrement', label: t('reorder.moveUp', { name: categoryLabel(item) }) }] : []),
                ...((getIndex() ?? 0) < order.length - 1 ? [{ name: 'increment', label: t('reorder.moveDown', { name: categoryLabel(item) }) }] : []),
              ]}
              onAccessibilityAction={({ nativeEvent }) => {
                if (nativeEvent.actionName === 'decrement') move(item, -1);
                if (nativeEvent.actionName === 'increment') move(item, 1);
              }}
              style={({ pressed }) => [s.moveBtn, pressed && s.pressed]}>
              <Menu size={20} color={isActive ? c.accent : c.fgMuted} strokeWidth={1.5} />
            </Pressable>
          </View>
        )}
      />
      {confirm.element}
      {prompt.element}
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    dragging: { borderColor: c.accent, elevation: 4 },
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
    hint: {
      ...ty.sm,
      fontFamily: fontFamily.sans,
      color: c.fgMuted,
      paddingHorizontal: space.s6,
      paddingBottom: space.s4,
    },
    listContent: { ...boundedContent, paddingHorizontal: space.s6, paddingBottom: space.s8 },
    sep: { height: space.s3 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.bgElevated,
      borderWidth: hairline,
      borderColor: c.hairline,
      borderRadius: radius.md,
      paddingLeft: space.s5,
      paddingRight: space.s3,
      minHeight: target.min + 8,
      gap: space.s3,
    },
    rowText: {
      ...ty.base,
      flex: 1,
      fontFamily: fontFamily.sans,
      color: c.fg,
    },
    moveBtn: {
      width: target.min,
      height: target.min,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
