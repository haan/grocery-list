import { PRODUCTS } from './seedCatalogData';
import { exactProduct, normalizeProductName } from './catalog';

export interface BrowserSuggestion {
  key: string;
  name: string;
  category?: string;
  recent: boolean;
  editable: boolean;
  letter: string;
}

const alphabet = new Intl.Collator('lb', { sensitivity: 'base', numeric: true });
const letterFor = (name: string) => {
  const first = [...normalizeProductName(name)][0] ?? '';
  return /\p{L}/u.test(first) ? first.toUpperCase() : '#';
};

type IndexedSuggestion = { row: BrowserSuggestion; terms: string[] };
const compareRows = (a: BrowserSuggestion, b: BrowserSuggestion) => {
  if (a.letter !== b.letter) {
    if (a.letter === '#') return 1;
    if (b.letter === '#') return -1;
    return alphabet.compare(a.letter, b.letter);
  }
  return alphabet.compare(a.name, b.name) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
};

// The catalog never changes during a session. Normalize aliases and sort once,
// rather than rebuilding all entries whenever the sheet opens or a key is typed.
const catalogIndex: IndexedSuggestion[] = PRODUCTS.map(product => ({
  row: { key: normalizeProductName(product.name), name: product.name,
    category: product.category, recent: false, editable: false, letter: letterFor(product.name) },
  terms: [...new Set([product.name, ...product.aliases].map(normalizeProductName))],
})).sort((a, b) => compareRows(a.row, b.row));

// History membership does not make a built-in name (or alias) a custom suggestion.
const catalogNames = new Set(catalogIndex.flatMap(entry => entry.terms));

let cachedNames: string[] = [];
let currentIndex = catalogIndex;
const results = new Map<string, BrowserSuggestion[]>();

function updateRecentIndex(recentNames: readonly string[]) {
  if (recentNames.length === cachedNames.length && recentNames.every((name, i) => name === cachedNames[i])) return;
  cachedNames = [...recentNames];
  results.clear();
  const personal = new Map<string, IndexedSuggestion>();
  for (const name of recentNames) {
    const key = normalizeProductName(name);
    if (!key) continue;
    const product = exactProduct(name);
    personal.set(key, {
      row: { key, name, category: product?.category, recent: true,
        editable: !catalogNames.has(key), letter: letterFor(name) },
      terms: [...new Set((product ? [name, product.name, ...product.aliases] : [name]).map(normalizeProductName))],
    });
  }
  const recent = [...personal.values()].sort((a, b) => compareRows(a.row, b.row));
  const merged: IndexedSuggestion[] = [];
  let next = 0;
  // Merge the small personal list into the already sorted catalog in one pass.
  for (const entry of catalogIndex) {
    if (personal.has(entry.row.key)) continue;
    while (next < recent.length && compareRows(recent[next].row, entry.row) < 0) merged.push(recent[next++]);
    merged.push(entry);
  }
  currentIndex = [...merged, ...recent.slice(next)];
}

/** Full alphabet, including personal names and confirmed aliases. Results are
 * read-only to callers; the small cache is invalidated whenever Recent changes.
 */
export function browseSuggestions(query: string, recentNames: readonly string[]): BrowserSuggestion[] {
  updateRecentIndex(recentNames);
  const q = normalizeProductName(query);
  const cached = results.get(q);
  if (cached) return cached;
  const matches = currentIndex.filter(entry => !q || entry.terms.some(term => term.includes(q))).map(entry => entry.row);
  // Bound cached searches; this never limits the number of displayed products.
  if (results.size >= 12) results.delete(results.keys().next().value!);
  results.set(q, matches);
  return matches;
}

/** Partial matches must not prevent adding the user's complete typed name. */
export function hasExactSuggestion(query: string, recentNames: readonly string[]): boolean {
  updateRecentIndex(recentNames);
  const q = normalizeProductName(query);
  return !!q && currentIndex.some(entry => entry.terms.includes(q));
}
