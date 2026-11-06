import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  StyleSheet,
  Keyboard,
  Animated,
  type ViewToken,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Search, Pencil, Check, X } from 'lucide-react-native';
import { usePrompt, useReducedMotion } from './Dialogs';
import { AddAction } from './AddAction';
import { useQueuedRows } from './useQueuedRows';
import { Snackbar } from './Snackbar';
import { useAccountStore } from '../store/account';
import type { Category } from '../data/categories';
import { browseSuggestions, hasExactSuggestion } from '../data/suggestionBrowser';
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

interface Props {
  active?: boolean;
  /** Lowercased names already present on the shopping list. */
  activeNames: Set<string>;
  /** Open a draft; acknowledge only a successful save. */
  onSelect: (name: string, category: Category | undefined, saved: (added: boolean) => void) => void;
  /** The "already added" pill text ("On list"). */
  presentLabel: string;
  /** A11y label for an already-present row. */
  presentA11y: (name: string) => string;

  addHint: string;
}

type SheetRow =
  | {
      t: 'header';
      key: string;
      label: string;
      dim?: boolean;
    }
  | {
      t: 'item';
      key: string;
      name: string;
      category?: Category;
      onList: boolean;
      recent: boolean;
      letter: string;
    };

function ItemPicker({
  active = true,
  activeNames,
  onSelect,
  presentLabel,
  presentA11y,
  addHint,
}: Props) {
  const { c } = useTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const prompt = usePrompt();
  const openPrompt = prompt.open;
  const inputRef = useRef<TextInput>(null);
  const browseRef = useRef<FlatList<SheetRow>>(null);
  const filteredRef = useRef<FlatList<SheetRow>>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (focusTimer.current) clearTimeout(focusTimer.current); }, []);
  const [query, setQuery] = useState('');
  const filtering = query.trim().length > 0;
  const listRef = filtering ? filteredRef : browseRef;
  const activeRef = useRef(active);
  activeRef.current = active;
  const [scrollLetter, setScrollLetter] = useState('');
  const [scrolling, setScrolling] = useState(false);
  const hintTop = useRef(new Animated.Value(space.s4)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const hideHintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const viewability = useRef({ itemVisiblePercentThreshold: 1 }).current;
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken<SheetRow>[] }) => {
    const row = viewableItems.find(token => token.isViewable)?.item;
    if (row) setScrollLetter(row.t === 'header' ? row.label : row.letter);
  }, []);
  const showScrollHint = useCallback(() => {
    if (hideHintTimer.current) clearTimeout(hideHintTimer.current);
    setScrolling(true);
  }, []);
  const hideScrollHint = useCallback(() => {
    if (hideHintTimer.current) clearTimeout(hideHintTimer.current);
    hideHintTimer.current = setTimeout(() => setScrolling(false), 500);
  }, []);
  useEffect(() => () => { if (hideHintTimer.current) clearTimeout(hideHintTimer.current); }, []);
  useEffect(() => {
    const animation = Animated.timing(hintOpacity, {
      toValue: scrolling ? 1 : 0, duration: reducedMotion ? 0 : 120, useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [scrolling, reducedMotion, hintOpacity]);
  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setScrolling(false);
    hintTop.setValue(space.s4);
  }, [query, hintTop, listRef]);

  const forgetUse = useAccountStore((st) => st.forgetUse);
  const restoreUse = useAccountStore((st) => st.restoreUse);
  const renameUse = useAccountStore((st) => st.renameUse);
  const history = useAccountStore((st) => st.history);

  const [snack, setSnack] = useState<{
    message: string;
    durationMs: number;
    undo?: () => void;
  } | null>(null);
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    if (active) return;
    if (focusTimer.current) clearTimeout(focusTimer.current);
    if (hideHintTimer.current) clearTimeout(hideHintTimer.current);
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setScrolling(false);
    hintTop.setValue(space.s4);
    setQuery('');
    setSnack(null);
    setKbHeight(0);
  }, [active, hintTop, listRef]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      if (activeRef.current) setKbHeight(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);


  const allSuggestions = useMemo(() => browseSuggestions('', history.map(entry => entry.name)), [history]);
  const suggestions = useMemo(() => filtering ? browseSuggestions(query, history.map(entry => entry.name)) : allSuggestions,
    [query, filtering, history, allSuggestions]);
  const canCreate = filtering && !hasExactSuggestion(query, history.map(entry => entry.name));
  const groupRows = useCallback((entries: typeof suggestions): SheetRow[] => {
    const out: SheetRow[] = [];
    let letter = '';
    for (const suggestion of entries) {
      if (suggestion.letter !== letter) {
        letter = suggestion.letter;
        out.push({ t: 'header', key: 'letter:' + letter, label: letter });
      }
      out.push({ t: 'item', ...suggestion, onList: activeNames.has(suggestion.name.toLowerCase()) });
    }
    return out;
  }, [activeNames]);
  const allRows = useMemo(() => groupRows(allSuggestions), [allSuggestions, groupRows]);
  const filteredRows = useMemo(() => filtering ? groupRows(suggestions) : [], [filtering, suggestions, groupRows]);
  const browseCount = useQueuedRows(allRows.length);
  const filteredCount = useQueuedRows(filteredRows.length);
  const browseRows = useMemo(() => allRows.slice(0, browseCount), [allRows, browseCount]);
  const searchRows = useMemo(() => filteredRows.slice(0, filteredCount), [filteredRows, filteredCount]);

  const add = useCallback((name: string, category?: Category) => {
    if (focusTimer.current) clearTimeout(focusTimer.current);
    Keyboard.dismiss();
    const trimmed = name.trim();
    const [first = ''] = trimmed;
    onSelect(first.toUpperCase() + trimmed.slice(first.length), category, (added) => {
      setQuery('');
      Haptics.selectionAsync().catch(() => {});
      setSnack({ message: added ? t('detail.addedToList') : t('detail.itemSaved'), durationMs: 1500 });
      // Wait for the details modal to finish dismissing before restoring focus.
      if (focusTimer.current) clearTimeout(focusTimer.current);
      focusTimer.current = setTimeout(() => { if (activeRef.current) inputRef.current?.focus(); }, 350);
    });
  }, [onSelect]);

  const forget = useCallback(
    (name: string) => {
      const removed = forgetUse(name);
      if (!removed) return;
      Haptics.selectionAsync().catch(() => {});
      setSnack({
        message: t('detail.forgotSuggestion', { name: removed.name }),
        durationMs: 5000,
        undo: () => restoreUse(removed),
      });
    },
    [forgetUse, restoreUse]
  );

  const editRecent = useCallback(
    (name: string) => {
      Keyboard.dismiss();
      openPrompt({
        presentation: 'sheet', title: t('detail.editSuggestion'),
        fieldLabel: t('detail.suggestionName'), message: t('detail.editSuggestionHelp'),
        initialValue: name, selectAll: true, confirmLabel: t('common.save'),
        onSubmit: next => renameUse(name, next),
        destructiveAction: { label: t('detail.forgetSuggestion'), onPress: () => forget(name) },
      });
    },
    [openPrompt, renameUse, forget]
  );

  const submitTyped = useCallback(() => {
    const n = query.trim();
    if (!canCreate) {
      Keyboard.dismiss();
      return;
    }
    add(n);
  }, [query, canCreate, add]);

  const renderRow = useCallback(
    ({ item: row }: { item: SheetRow }) => {
      if (row.t === 'header') {
        return (
          <View style={s.headerRow} accessibilityRole="header">
            <Text style={[s.sectionHeader, row.dim && s.sectionHeaderDim]}>
              {row.label}
            </Text>
          </View>
        );
      }
      const { name, category, onList, recent } = row;
      return (
        <View style={s.itemRow}>
          <Pressable
            style={s.itemTap}
            onPress={() => add(name, category)}
            accessibilityRole="button"
            accessibilityLabel={onList ? presentA11y(name) : name}
            accessibilityHint={onList ? undefined : addHint}
          >
            <Text style={[s.itemName, onList && s.itemNameOnList]} numberOfLines={2}>
              {name}
            </Text>
            {onList ? (
              <View style={s.pill}>
                <Text style={s.pillText}>{presentLabel}</Text>
              </View>
            ) : null}
          </Pressable>

          {recent ? (
            <Pressable
              onPress={() => editRecent(name)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={t('detail.editSuggestionA11y', { name })}
              style={({ pressed }) => [s.editBox, pressed && s.pressed]}
            >
              <Pencil size={18} color={c.fgMuted} strokeWidth={1.5} />
            </Pressable>
          ) : onList ? (
            <View
              style={s.checkBox}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            >
              <Check size={18} color={c.accent} strokeWidth={2} />
            </View>
          ) : null}
        </View>
      );
    },
    [s, c, add, editRecent, presentLabel, presentA11y]
  );

  const renderList = (data: SheetRow[], ref: React.RefObject<FlatList<SheetRow> | null>, visible: boolean, loading: boolean) => (
    <FlatList
        ref={ref}
        testID={visible ? 'suggestionBrowser' : 'preparedSuggestionBrowser'}
        data={data}
        // Every queued row is retained; scrolling never requests another batch.
        initialNumToRender={data.length}
        maxToRenderPerBatch={Math.max(1, data.length)}
        removeClippedSubviews={false}
        ListFooterComponent={loading ? <Text style={s.loadingFooter}>{t('detail.preparingSuggestions')}</Text> : null}
        ListEmptyComponent={<View style={s.emptyState}>
          <View style={s.emptyIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Search size={28} color={c.fgMuted} strokeWidth={1.5} />
          </View>
          <Text style={s.hint}>{t('detail.noMatchingSuggestions')}</Text>
        </View>}
        keyExtractor={(r) => r.key}
        renderItem={renderRow}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        contentContainerStyle={s.listContent}
        onViewableItemsChanged={(info) => { if (visible) onViewableItemsChanged(info); }}
        viewabilityConfig={viewability}
        onScrollBeginDrag={visible ? showScrollHint : undefined}
        onMomentumScrollBegin={visible ? showScrollHint : undefined}
        onScrollEndDrag={visible ? hideScrollHint : undefined}
        onMomentumScrollEnd={visible ? hideScrollHint : undefined}
        scrollEventThrottle={48}
        onScroll={({ nativeEvent: { contentOffset, contentSize, layoutMeasurement } }) => {
          if (!visible) return;
          const distance = contentSize.height - layoutMeasurement.height;
          const progress = distance > 0 ? Math.max(0, Math.min(1, contentOffset.y / distance)) : 0;
          // Move only the overlay; scrolling must not rerender every suggestion.
          hintTop.setValue(space.s4 + progress * Math.max(0, layoutMeasurement.height - 52 - space.s4 * 2));
        }}
      />
  );

  return (
    <View style={s.flex}>
      <View style={s.searchWrap}>
        <Search size={18} color={c.fgMuted} strokeWidth={1.5} />
        <TextInput
          ref={inputRef}
          style={s.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('detail.searchItems')}
          placeholderTextColor={c.fgMuted}
          returnKeyType="search"
          blurOnSubmit={false}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={submitTyped}
          accessibilityLabel={t('detail.searchItems')}
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => {
              setQuery('');
              requestAnimationFrame(() => { if (activeRef.current) inputRef.current?.focus(); });
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('detail.clearSearch')}
            style={({ pressed }) => [s.clearBtn, pressed && s.pressed]}
          >
            <X size={18} color={c.fgMuted} strokeWidth={1.5} />
          </Pressable>
        ) : null}
      </View>

      {canCreate ? <AddAction label={t('detail.addNamedItem', { name: query.trim() })}
        variant="primary" onPress={() => add(query)} /> : null}

      <View style={s.flex}>
        <View style={[s.browserLayer, filtering && s.hiddenLayer]} pointerEvents={filtering ? 'none' : 'auto'}
          accessibilityElementsHidden={filtering} importantForAccessibility={filtering ? 'no-hide-descendants' : 'auto'}>
          {renderList(browseRows, browseRef, !filtering, browseCount < allRows.length)}
        </View>
        {filtering ? <View style={s.browserLayer}>
          {renderList(searchRows, filteredRef, true, filteredCount < filteredRows.length)}
        </View> : null}
      {scrollLetter ? <Animated.View testID="alphabetScrollHint" pointerEvents="none" accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants" style={[s.scrollHint, { transform: [{ translateY: hintTop }], opacity: hintOpacity }]}>
        <Text style={s.scrollHintText}>{scrollLetter}</Text>
      </Animated.View> : null}
      </View>

      <Snackbar
        visible={!!snack}
        message={snack?.message ?? ''}
        durationMs={snack?.durationMs}
        actionLabel={snack?.undo ? t('common.undo') : undefined}
        onAction={snack?.undo}
        onDismiss={() => setSnack(null)}
        bottomOffset={kbHeight}
      />

      {prompt.element}
    </View>
  );
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    flex: { flex: 1 },
    browserLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    hiddenLayer: { opacity: 0 },
    loadingFooter: { ...ty.sm, fontFamily: fontFamily.sans, color: c.fgMuted,
      paddingVertical: space.s5, textAlign: 'center' },
    pressed: { opacity: 0.6 },

    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.s3,
      marginHorizontal: space.s6,
      marginBottom: space.s4,
      paddingHorizontal: space.s4,
      backgroundColor: c.bgSubtle,
      borderWidth: hairline,
      borderColor: c.hairline,
      borderRadius: radius.md,
      minHeight: target.min,
    },
    searchInput: {
      ...ty.base,
      flex: 1,
      fontFamily: fontFamily.sans,
      color: c.fg,
      paddingVertical: space.s3,
    },
    clearBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },

    listContent: {
      paddingHorizontal: space.s6,
      paddingBottom: space.s9,
    },
    scrollHint: {
      position: 'absolute', top: 0, right: space.s4, width: 52, height: 52,
      borderRadius: radius.md, backgroundColor: c.inkButton,
      alignItems: 'center', justifyContent: 'center',
    },
    scrollHintText: { ...ty.md, fontFamily: fontFamily.sansSemibold, color: c.inkButtonText },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.s2,
      marginTop: space.s5,
      marginBottom: space.s2,
    },
    sectionHeader: {
      ...ty.base,
      fontFamily: fontFamily.sansSemibold,
      color: c.fgMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    sectionHeaderDim: { color: c.fgMuted },
    headerToggle: {
      marginLeft: 'auto',
      paddingVertical: space.s1,
      paddingLeft: space.s3,
    },
    headerToggleText: {
      ...ty.xs,
      fontFamily: fontFamily.sansSemibold,
      color: c.accent,
      letterSpacing: 0.3,
    },
    emptyState: {
      alignItems: 'center',
      paddingTop: space.s9,
      paddingBottom: space.s7,
      gap: space.s5,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.bgSubtle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hint: {
      ...ty.base,
      fontFamily: fontFamily.sans,
      color: c.fgMuted,
      textAlign: 'center',
      maxWidth: 260,
    },

    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.s2,
      borderBottomWidth: hairline,
      borderBottomColor: c.hairline,
    },
    itemTap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.s3,
      minHeight: target.min,
      paddingVertical: space.s2,
    },
    itemName: {
      ...ty.base,
      fontFamily: fontFamily.sans,
      color: c.fg,
      flexShrink: 1,
    },
    itemNameOnList: { color: c.fgMuted },
    // Same side room as the list's ×N quantity badge.
    pill: {
      paddingHorizontal: space.s3,
      paddingVertical: 2,
      borderRadius: radius.sm,
      backgroundColor: c.accentBg,
    },
    pillText: {
      ...ty.xs,
      fontFamily: fontFamily.sansSemibold,
      color: c.accent,
    },
    editBox: {
      width: target.min,
      height: target.min,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkBox: {
      width: target.min,
      height: target.min,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      backgroundColor: c.accentBg,
    },
  });
}

export default React.memo(ItemPicker);
