import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, TextInput, ScrollView, StyleSheet, KeyboardAvoidingView, Keyboard } from 'react-native';
import { Check, ChevronRight, Trash2 } from 'lucide-react-native';
import { useReducedMotion } from './Dialogs';
import { Stepper } from './Stepper';
import { useListsStore } from '../store/lists';
import { MAX_QTY, type GroceryItem } from '../data/list';
import { createItemDraft, renameDraft, validQuantity, type ItemDraft, type DraftError } from '../data/itemDraft';
import { categoryLabel } from '../data/categories';
import { t } from '../i18n';
import { useTheme, fontFamily, space, radius, target, type as ty, hairline, type Colors } from '../theme';

interface EditTarget {
  listId: string;
  itemId?: string;
  name?: string;
  category?: string;
  onRemove?: (item: GroceryItem) => void;
  onSave?: (item: GroceryItem, added: boolean) => void;
}
const errorKeys = {
  name: 'detail.draftNameError', quantity: 'detail.draftQuantityError',
  duplicate: 'detail.draftDuplicateError', deleted: 'detail.draftDeletedError',
  aisle: 'detail.draftAisleError', list: 'detail.draftListError',
} as const;

export function useItemEditor(): { open: (cfg: EditTarget) => void; close: () => void; element: React.ReactElement } {
  const { c } = useTheme();
  const s = makeStyles(c);
  const reduced = useReducedMotion();
  const saved = useRef(false);
  const [target_, setTarget] = useState<EditTarget | null>(null);
  const [draft, setDraft] = useState<ItemDraft | null>(null);
  const [error, setError] = useState<DraftError | null>(null);
  const [choosingAisle, setChoosingAisle] = useState(false);
  const [noteHeight, setNoteHeight] = useState<number>(target.min);
  const list = useListsStore(st => target_ ? st.getList(target_.listId) : undefined);
  const item = list?.items.find(i => i.id === draft?.original?.id && i.deletedAt == null);
  const categoryOrder = list?.categoryOrder ?? [];
  const close = useCallback(() => { setTarget(null); setDraft(null); Keyboard.dismiss(); }, []);
  useEffect(() => { if (target_ && !list) close(); }, [target_, list, close]);
  const open = useCallback((cfg: EditTarget) => {
    const current = useListsStore.getState().getList(cfg.listId);
    if (!current || (cfg.itemId && !current.items.some(i => i.id === cfg.itemId && i.deletedAt == null))) return;
    Keyboard.dismiss();
    saved.current = false;
    setDraft(createItemDraft(current, cfg));
    setError(null); setChoosingAisle(false); setNoteHeight(target.min); setTarget(cfg);
  }, []);
  const update = (patch: Partial<ItemDraft>) => { setDraft(d => d ? { ...d, ...patch } : d); setError(null); };
  const save = () => {
    if (!draft || !target_ || saved.current) return;
    const result = useListsStore.getState().saveItemDraft(draft);
    if (!result.ok) { setError(result.error); return; }
    saved.current = true;
    const callback = target_.onSave;
    close();
    callback?.(result.item, result.added);
  };
  const remove = () => { if (item) target_?.onRemove?.(item); close(); };
  const invalidQuantity = !!draft && !validQuantity(draft.quantity);
  const disabled = !draft?.name.trim() || invalidQuantity;
  const actionLabel = draft?.mode === 'edit' ? t('common.save') : t('detail.addItemButton');
  const dismiss = () => { if (choosingAisle) setChoosingAisle(false); else close(); };
  return { open, close, element: (
    <Modal visible={!!target_ && !!draft && !!list} transparent animationType={reduced ? 'none' : 'slide'}
      statusBarTranslucent onRequestClose={dismiss}>
      <KeyboardAvoidingView style={s.flex} behavior="height">
        <Pressable testID="itemEditorDismiss" style={s.overlay} onPress={dismiss} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Pressable style={s.sheet} onPress={e => e.stopPropagation()}>
            {draft && choosingAisle ? <>
              <View style={s.headerRow}><Text style={s.title} accessibilityRole="header">{t('detail.chooseAisle')}</Text></View>
              <ScrollView style={s.fields} keyboardShouldPersistTaps="handled">
                {categoryOrder.map(cat => <Pressable key={cat}
                  onPress={() => { update({ category: cat, explicitCategory: true }); setChoosingAisle(false); }}
                  accessibilityRole="button" accessibilityState={{ selected: cat === draft.category }} accessibilityLabel={categoryLabel(cat)}
                  style={({ pressed }) => [s.aisleOption, cat === draft.category && s.selectedOption, pressed && s.pressed]}>
                  <Text style={[s.aisleName, cat === draft.category && s.selectedName]}>{categoryLabel(cat)}</Text>
                  {cat === draft.category ? <Check size={20} color={c.accent} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /> : null}
                </Pressable>)}
              </ScrollView>
              <View style={s.actions}>
                <Pressable onPress={() => setChoosingAisle(false)} accessibilityRole="button" accessibilityLabel={t('common.cancel')} style={[s.actionBtn, s.cancelBtn]}>
                  <Text style={s.actionBtnText}>{t('common.cancel')}</Text>
                </Pressable>
              </View>
            </> : draft ? <>
              <View style={s.headerRow}><Text style={s.title} accessibilityRole="header">
                {draft.mode === 'edit' ? t('detail.editItem') : t('detail.addItemButton')}
              </Text>
                {item && target_?.onRemove ? <Pressable onPress={remove} accessibilityRole="button"
                  accessibilityLabel={t('detail.remove')} style={({ pressed }) => [s.removeIcon, pressed && s.pressed]}>
                  <Trash2 size={22} color={c.danger} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
                </Pressable> : null}
              </View>
              <ScrollView style={s.fields} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={s.fieldLabel}>{t('detail.itemNameLabel')}</Text>
                <TextInput style={s.input} value={draft.name} onChangeText={name => {
                  if (list) { setDraft(renameDraft(draft, name, list)); setError(null); }
                }} placeholder={t('detail.itemNameLabel')} placeholderTextColor={c.fgMuted}
                  accessibilityLabel={t('detail.itemNameLabel')} autoFocus={!draft.initialName} />
                {!draft.name.trim() ? <Text style={s.hint}>{t('detail.draftNameError')}</Text> : null}
                <View style={s.qtyRow}>
                  <Text style={[s.fieldLabel, s.qtyLabel]}>{t('detail.quantityLabel')}</Text>
                  <Stepper value={validQuantity(draft.quantity) ? Number(draft.quantity) : 1} min={1} max={MAX_QTY}
                    onChange={q => update({ quantity: String(q) })} label={t('detail.quantityOf', { name: draft.name })}
                    inputValue={draft.quantity} onChangeText={quantity => update({ quantity })} />
                </View>
                {invalidQuantity ? <Text accessibilityRole="alert" style={s.error}>{t('detail.draftQuantityError')}</Text> : null}
                <Pressable onPress={() => { Keyboard.dismiss(); setChoosingAisle(true); }}
                  accessibilityRole="button" accessibilityLabel={t('detail.aisleLabel')}
                  accessibilityValue={{ text: categoryLabel(draft.category) }} accessibilityState={{ expanded: false }}
                  style={({ pressed }) => [s.aisleRow, pressed && s.pressed]}>
                  <Text style={[s.fieldLabel, s.qtyLabel]}>{t('detail.aisleLabel')}</Text>
                  <Text style={s.aisleValue}>{categoryLabel(draft.category)}</Text>
                  <ChevronRight size={20} color={c.fgMuted} />
                </Pressable>
                <Text style={s.fieldLabel}>{t('detail.noteTitle')}</Text>
                <TextInput style={[s.input, s.noteInput, { height: Math.min(160, noteHeight) }]} value={draft.note}
                  onChangeText={note => { update({ note }); if (!note) setNoteHeight(target.min); }}
                  onContentSizeChange={e => setNoteHeight(Math.max(target.min, Math.ceil(e.nativeEvent.contentSize.height)))}
                  multiline numberOfLines={1} scrollEnabled={noteHeight > 160} accessibilityLabel={t('detail.noteTitle')} />
              </ScrollView>
              {error ? <Text accessibilityRole="alert" style={[s.error, s.conflict]}>{t(errorKeys[error])}</Text> : null}
              <View style={s.actions}>
                <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t('common.cancel')} style={[s.actionBtn, s.cancelBtn]}>
                  <Text style={s.actionBtnText}>{t('common.cancel')}</Text>
                </Pressable>
                <Pressable onPress={save} disabled={disabled} accessibilityRole="button" accessibilityLabel={actionLabel} accessibilityState={{ disabled }}
                  style={[s.actionBtn, s.saveBtn, disabled && s.disabled]}>
                  <Text style={[s.actionBtnText, s.saveText]}>{actionLabel}</Text>
                </Pressable>
              </View>
            </> : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  ) };
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    fields: { flexShrink: 1 },
    hint: { ...ty.sm, color: c.fgMuted },
    error: { ...ty.sm, color: c.danger },
    conflict: { marginTop: space.s3 },
    cancelBtn: { borderColor: c.hairlineStrong },
    saveBtn: { backgroundColor: c.inkButton, borderColor: c.inkButton },
    pressed: { opacity: 0.6 },

    overlay: {
      flex: 1,
      backgroundColor: c.bgScrim,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: c.bgElevated,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderWidth: hairline,
      borderColor: c.hairline,
      paddingHorizontal: space.s7,
      paddingTop: space.s4,
      paddingBottom: space.s7,
      maxHeight: '88%',
    },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: space.s3,
    },
    title: {
      ...ty.md,
      fontFamily: fontFamily.sansSemibold,
      color: c.fg,
    },
    fieldLabel: {
      ...ty.xs,
      fontFamily: fontFamily.sansSemibold,
      color: c.fgMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginTop: space.s5,
      marginBottom: space.s2,
    },
    input: {
      ...ty.base,
      fontFamily: fontFamily.sans,
      color: c.fg,
      backgroundColor: c.bg,
      borderWidth: hairline,
      borderColor: c.hairlineStrong,
      borderRadius: radius.md,
      paddingHorizontal: space.s5,
      paddingVertical: space.s4,
      minHeight: target.min,
    },
    noteInput: {
      textAlignVertical: 'top',
    },

    qtyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space.s5,
    },
    qtyLabel: { marginTop: 0, marginBottom: 0 },

    aisleRow: {
      flexDirection: 'row', alignItems: 'center', gap: space.s3,
      marginTop: space.s5, paddingVertical: space.s3, minHeight: target.min,
      borderBottomWidth: hairline, borderBottomColor: c.hairline,
    },
    aisleValue: { ...ty.base, fontFamily: fontFamily.sans, color: c.fg, flex: 1, textAlign: 'right' },
    aisleOption: {
      flexDirection: 'row', alignItems: 'center', gap: space.s3,
      paddingHorizontal: space.s4, paddingVertical: space.s4, minHeight: target.min,
      borderBottomWidth: hairline, borderBottomColor: c.hairline,
    },
    aisleName: { ...ty.base, fontFamily: fontFamily.sans, color: c.fg, flex: 1 },
    selectedOption: { backgroundColor: c.accentBg },
    selectedName: { fontFamily: fontFamily.sansSemibold },
    disabled: { opacity: 0.4 },
    saveText: {
      ...ty.base,
      fontFamily: fontFamily.sansSemibold,
      color: c.inkButtonText,
    },

    actions: {
      flexDirection: 'row',
      gap: space.s4,
      marginTop: space.s5,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space.s2,
      minHeight: 52,
      paddingHorizontal: space.s4,
      borderRadius: radius.md,
      borderWidth: hairline,
    },
    actionBtnText: {
      ...ty.base,
      fontFamily: fontFamily.sansSemibold,
      color: c.fg,
    },
    removeIcon: {
      width: target.min,
      height: target.min,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
