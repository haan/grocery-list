import {
  t,
  setLocaleStrings,
  resetToBaseStrings,
  applyDeviceLocale,
  CANONICAL_LOCALES,
} from '../index';
import { LOCALES } from '../locales';
import { APP_STRINGS } from '../appStrings';

describe('i18n language switching', () => {
  afterEach(() => resetToBaseStrings());

  it('overlays a locale, then returns ALL THE WAY back to English', () => {
    setLocaleStrings({ common: { cancel: 'Test cancel A' } });
    expect(t('common.cancel')).toBe('Test cancel A');

    // The reported bug: switching back to English must clear the overlay, not
    // leave the previous language stuck.
    resetToBaseStrings();
    expect(t('common.cancel')).toBe('Cancel');
  });

  it('survives repeated round-trips without a language sticking', () => {
    for (let i = 0; i < 3; i++) {
      setLocaleStrings({ common: { cancel: 'Test cancel B' } });
      expect(t('common.cancel')).toBe('Test cancel B');
      resetToBaseStrings();
      expect(t('common.cancel')).toBe('Cancel');

      setLocaleStrings({ common: { cancel: 'Test cancel C' } });
      expect(t('common.cancel')).toBe('Test cancel C');
      resetToBaseStrings();
      expect(t('common.cancel')).toBe('Cancel');
    }
  });

  it('applyDeviceLocale resets to English when the device locale is unmatched', () => {
    setLocaleStrings({ common: { cancel: 'Test cancel C' } });
    expect(t('common.cancel')).toBe('Test cancel C');

    // The Jest runtime's locale is en-US, which has no overlay in LOCALES, so
    // applyDeviceLocale must reset to the English base — not keep the test translation.
    applyDeviceLocale();
    expect(t('common.cancel')).toBe('Cancel');
  });
});

describe('i18n key parity (in-app translation drift net)', () => {
  type Dict = { [key: string]: unknown };

  const flatten = (obj: Dict, prefix = ''): string[] =>
    Object.entries(obj ?? {}).flatMap(([k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      return v && typeof v === 'object' ? flatten(v as Dict, key) : [key];
    });

  it('every APP_STRINGS key is translated in every supported locale', () => {
    const appKeys = flatten(APP_STRINGS as unknown as Dict);
    const failures: string[] = [];
    for (const loc of CANONICAL_LOCALES) {
      const dict = (LOCALES as Dict)[loc];
      if (!dict) {
        // A supported locale with no dict at all: every domain key falls back.
        if (appKeys.length) failures.push(`${loc}: no locale dict in LOCALES`);
        continue;
      }
      const locKeys = new Set(flatten(dict as Dict));
      for (const k of appKeys) {
        if (!locKeys.has(k)) failures.push(`${loc}: missing "${k}"`);
      }
    }
    // A failure lists exactly which locale dicts silently fall back to English.
    // Fix missing keys in the corresponding locale dictionary.
    expect(failures).toEqual([]);
  });
});
