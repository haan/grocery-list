import { APP_STRINGS } from '../appStrings';
import { SHELL_STRINGS } from '../shellStrings';
import { LOCALES } from '../locales';
import { t, resetToBaseStrings } from '../index';
import * as fs from 'node:fs';
import * as path from 'node:path';
import ts from 'typescript';

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
  it('every literal translation lookup in app code resolves in English', () => {
    resetToBaseStrings();
    const failures: string[] = [];
    function scan(dir: string) {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === '__tests__') continue;
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) { scan(file); continue; }
        if (!/\.tsx?$/.test(file)) continue;
        const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        function visit(node: ts.Node) {
          if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 't') {
            const key = node.arguments[0];
            if (key && ts.isStringLiteral(key) && t(key.text) === key.text) failures.push(`${entry.name}: ${key.text}`);
          }
          ts.forEachChild(node, visit);
        }
        visit(source);
      }
    }
    scan(path.resolve(__dirname, '../..'));
    expect(failures).toEqual([]);
  });

  it('every registered locale carries every SHELL_STRINGS key', () => {
    const shellKeys = leafPaths(SHELL_STRINGS as unknown as Dict);
    const failures: string[] = [];
    for (const [locale, dict] of Object.entries(LOCALES)) {
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
      const missing = appKeys.filter((k) => !hasLeaf(dict as Dict, k));
      if (missing.length) failures.push(`${locale}: ${missing.join(', ')}`);
    }
    expect(failures).toEqual([]);
  });

  it('every translation preserves interpolation placeholders and is nonempty', () => {
    resetToBaseStrings();
    const keys = new Set([...leafPaths(SHELL_STRINGS), ...leafPaths(APP_STRINGS)]);
    const tokens = (value: string) => [...new Set(value.match(/\{\w+\}/g) ?? [])].sort();
    for (const dict of Object.values(LOCALES)) for (const key of keys) {
      const translated = key.split('.').reduce<any>((value, part) => value?.[part], dict);
      expect(typeof translated).toBe('string');
      expect(translated.trim().length).toBeGreaterThan(0);
      expect(tokens(translated)).toEqual(tokens(t(key)));
    }
  });
});
