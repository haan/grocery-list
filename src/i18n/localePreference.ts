import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CANONICAL_LOCALES,
  applyDeviceLocale,
  setLocaleStrings,
  resetToBaseStrings,
  getActiveLocale,
} from './index';
import { LOCALES } from './locales';
import { logEvent } from '../feedback/log';

/** 'system' follows the phone (the default — today's behavior). Any other value
 *  is an explicit locale tag the user chose ('en' or a CANONICAL_LOCALES tag). */
export type LocalePref = 'system' | string;

/**
 * The display name of each language in its OWN language (autonym) — never
 * translated into the current UI language, so a user who lands in the wrong one
 * can always find their way back (the universal language-picker convention).
 * Keyed by locale tag; 'system' is labelled from the translated shell strings.
 */
export const AUTONYMS: Record<string, string> = {
  en: 'English',
  lb: 'Lëtzebuergesch',
};

const STORAGE_KEY = 'ja.locale.preference';

// Module-level singleton store — one source of truth shared by the control, the
// apply-on-launch hook, and the root remount key, without a React context
// wrapping the tree (mirrors themePreference.ts). Components subscribe via
// useSyncExternalStore.
let pref: LocalePref = 'system';
let version = 0; // remount key — bumps only when the active language changes
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Point the active dictionary at a preference. 'system' re-reads the device
 *  locale; 'en' resets to the English base; any other tag overlays that locale
 *  (falling back to English per-key for anything untranslated); an unknown tag
 *  resets to English. */
function applyPref(p: LocalePref): void {
  if (p === 'system') {
    applyDeviceLocale();
    return;
  }
  if (p === 'en') {
    // Explicit English is a real destination, not just "stop translating":
    // reset to the English base so we never re-overlay the device locale (which
    // would re-translate on a non-English phone) and never leave a prior
    // overlay in place (the reported "can't get back to English" bug).
    resetToBaseStrings();
    return;
  }
  const dict = LOCALES[p];
  if (dict) setLocaleStrings(dict, p);
  else resetToBaseStrings();
}

function coerce(value: string | null): LocalePref {
  if (value === 'system' || value === 'en') return value;
  return value && value in LOCALES ? value : 'system';
}

/** Persist + apply a choice. Remount navigation only if its language changes. */
export function setLocalePreference(p: LocalePref): void {
  // A breadcrumb, because a language switch remounts the whole tree — so any
  // report of "it went blank / went back to the start" right after one wants to
  // show that it happened. The tag only; nothing about the user.
  logEvent('settings', 'language changed', { from: pref, to: p });
  const before = getActiveLocale();
  pref = coerce(p);
  applyPref(pref);
  if (before !== getActiveLocale()) version += 1;
  emit();
  AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
}

let loadStarted = false;

/** Restore once; refresh existing screens if the effective language changes. */
export function loadLocalePreference(): void {
  if (loadStarted) return;
  loadStarted = true;
  AsyncStorage.getItem(STORAGE_KEY)
    .then((value) => {
      const before = getActiveLocale();
      pref = coerce(value);
      applyPref(pref);
      if (value !== null && value !== pref) {
        AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
      }
      if (before !== getActiveLocale()) {
        version += 1;
      }
    })
    .catch(() => {})
    .finally(emit);
}

/**
 * Call ONCE near the app root (the canonical AppShell): on mount it restores the
 * saved language and applies it before the user touches anything. Without it the
 * app silently follows the OS, ignoring a saved choice.
 */
export function useApplyLocalePreference(): void {
  useEffect(() => {
    loadLocalePreference();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshSystemLocale();
    });
    return () => subscription.remove();
  }, []);
}

/** Called on foreground; explicit choices are never overridden by Android. */
export function refreshSystemLocale(): void {
  if (pref !== 'system') return;
  const before = getActiveLocale();
  applyDeviceLocale();
  if (before !== getActiveLocale()) { version += 1; emit(); }
}

/**
 * The remount key. Use it as `key` on the app's <NavigationContainer> so the
 * whole tree re-renders when the language changes — the one piece of wiring a
 * JS-dictionary i18n needs that a theme change gets free from useColorScheme().
 */
export function useLocaleVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => version);
}

/** Reactive accessor for the picker UI and anything that branches on the user's
 *  explicit choice. */
export function useLocalePreference(): {
  pref: LocalePref;
  setPref: (pref: LocalePref) => void;
} {
  const value = useSyncExternalStore(subscribe, () => pref, () => pref);
  const setPref = useCallback((next: LocalePref) => setLocalePreference(next), []);
  return { pref: value, setPref };
}

/** English and System are always offered; registered translations follow. */
export function availableLocales(): string[] {
  return CANONICAL_LOCALES.filter((locale) => !!LOCALES[locale]);
}
