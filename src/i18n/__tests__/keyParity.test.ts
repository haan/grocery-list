import { APP_STRINGS } from '../appStrings';
import { SHELL_STRINGS } from '../shellStrings';
import { SHELL_LOCALES } from '../shellLocales';
import { LOCALES } from '../locales';

type Dict = { [key: string]: string | Dict };

/** Dotted paths of every string leaf in a dictionary. */
function leafPaths(d: Dict, prefix = ''): string[] {
  return Object.entries(d).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object' ? leafPaths(v as Dict, path) : [path];
  });
}

/** True when `path` resolves to a string leaf in `d`. */
function hasLeaf(d: Dict, path: string): boolean {
  let cur: string | Dict | undefined = d;
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') return false;
    cur = (cur as Dict)[part];
  }
  return typeof cur === 'string';
}

describe('i18n key parity (translation drift net)', () => {
  it('every shell locale carries every SHELL_STRINGS key', () => {
    const shellKeys = leafPaths(SHELL_STRINGS as unknown as Dict);
    const failures: string[] = [];
    for (const [locale, dict] of Object.entries(SHELL_LOCALES)) {
      const missing = shellKeys.filter((k) => !hasLeaf(dict as Dict, k));
      if (missing.length) failures.push(`${locale}: ${missing.join(', ')}`);
    }
    expect(failures).toEqual([]);
  });

  it('every domain-translated locale carries every APP_STRINGS key', () => {
    const appKeys = leafPaths(APP_STRINGS as unknown as Dict);
    if (appKeys.length === 0) return; // fresh app, no domain copy yet
    const failures: string[] = [];
    for (const [locale, dict] of Object.entries(LOCALES)) {
      const present = appKeys.filter((k) => hasLeaf(dict as Dict, k));
      if (present.length === 0) continue; // no domain pass for this locale yet
      const missing = appKeys.filter((k) => !hasLeaf(dict as Dict, k));
      if (missing.length) failures.push(`${locale}: ${missing.join(', ')}`);
    }
    expect(failures).toEqual([]);
  });
});
