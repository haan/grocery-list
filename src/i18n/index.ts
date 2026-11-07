import { SHELL_STRINGS } from './shellStrings';
import { APP_STRINGS } from './appStrings';
import { LOCALES } from './locales';
import { getLocales } from 'expo-localization';

type Dict = { [key: string]: string | Dict };


export const CANONICAL_LOCALES: string[] = Object.keys(LOCALES);

function deepMerge(base: Dict, extra: Dict): Dict {
  const out: Dict = { ...base };
  for (const [k, v] of Object.entries(extra)) {
    const cur = out[k];
    if (v && typeof v === 'object' && cur && typeof cur === 'object') {
      out[k] = deepMerge(cur as Dict, v as Dict);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** The English base — SHELL + APP, no locale overlay. A fresh object every call
 *  so a reset can never alias a previously-overlaid dictionary. */
function baseStrings(): Dict {
  return deepMerge(SHELL_STRINGS as Dict, APP_STRINGS as Dict);
}

let active: Dict = baseStrings();
let activeLocale = 'en';
export function getActiveLocale(): string { return activeLocale; }

/** Drop every locale overlay and return the active dictionary to English.
 *  This is what makes "English" (and System on an English phone) a real
 *  destination, not just "stop translating": without an explicit reset,
 *  switching away from a locale leaves the previous overlay in place and the
 *  old language sticks on screen. */
export function resetToBaseStrings(): void {
  active = baseStrings();
  activeLocale = 'en';
}

/** Replace the active dictionary (locale switch). Keeps SHELL+APP as the
 *  English base and overlays the locale's translations on top. */
export function setLocaleStrings(localeDict: Dict, locale = 'en'): void {
  active = deepMerge(baseStrings(), localeDict);
  activeLocale = locale;
}

/**
 * Pick the best available locale for a device locale tag. Tries the full tag
 * (e.g. "pt-BR"), then the primary subtag (e.g. "pt" → "pt-BR" if that's the
 * only Portuguese we have), else null (English stays). Pure — exported for test.
 */
export function pickLocale(
  deviceLocale: string,
  available: string[] = Object.keys(LOCALES)
): string | null {
  if (!deviceLocale || !available.length) return null;
  const tag = deviceLocale.replace('_', '-');
  if (available.includes(tag)) return tag;
  const primary = tag.split('-')[0].toLowerCase();
  // Exact primary match (e.g. "es-MX" → "es").
  const exact = available.find((a) => a.toLowerCase() === primary);
  if (exact) return exact;
  // Else a regional variant sharing the primary subtag (e.g. "pt" → "pt-BR").
  const variant = available.find((a) => a.toLowerCase().split('-')[0] === primary);
  return variant ?? null;
}

/** Apply the device's locale from the LOCALES map (no-op when English or when
 *  no matching translation exists). Called once at module load below. */
export function applyDeviceLocale(): void {
  // Reset first so a device locale with no translation (e.g. English) returns
  // to English instead of leaving a previous overlay in place.
  resetToBaseStrings();
  try {
    // Include English when choosing: an English preference must beat a later lb.
    const match = getLocales().map(l => pickLocale(l.languageTag, ['en', ...CANONICAL_LOCALES])).find(Boolean);
    if (match && LOCALES[match]) setLocaleStrings(LOCALES[match], match);
  } catch {
    /* keep English base */
  }
}

/** Look up a dotted key. Returns the key itself if absent (visible, never throws). */
export function t(key: string, vars?: Record<string, string | number>): string {
  let node: string | Dict | undefined = active;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object') {
      node = (node as Dict)[part];
    } else {
      node = undefined;
      break;
    }
  }
  if (typeof node !== 'string') return key;
  if (!vars) return node;
  return node.replace(/\{(\w+)\}/g, (m, name) =>
    name in vars ? String(vars[name]) : m
  );
}

// Device language and the selected interface language are deliberately separate.
// Intl formats values; expo-localization reads Android's actual preferences.

/** The device's resolved BCP-47 locale (e.g. "en-US"), with a safe fallback. */
export function getLocale(): string {
  try {
    return getLocales()[0]?.languageTag || 'en-US';
  } catch {
    return 'en-US';
  }
}

export function formatDate(
  value: Date | number,
  opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' },
  locale = getActiveLocale()
): string {
  try {
    return new Intl.DateTimeFormat(locale, opts).format(value);
  } catch {
    return new Date(value).toDateString();
  }
}

export function formatNumber(
  value: number,
  opts: Intl.NumberFormatOptions = {},
  locale = getActiveLocale()
): string {
  try {
    return new Intl.NumberFormat(locale, opts).format(value);
  } catch {
    return String(value);
  }
}

/** Format a minor-unit integer (cents/pence) or a major-unit number as
 *  currency. Pass `minor: true` to divide by the currency's minor scale. */
export function formatCurrency(
  amount: number,
  currency: string,
  locale = getActiveLocale()
): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

// The stored override is applied by the app shell during startup.
applyDeviceLocale();
