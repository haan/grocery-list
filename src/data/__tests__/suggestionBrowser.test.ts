import { browseSuggestions, hasExactSuggestion } from '../suggestionBrowser';
import { normalizeProductName } from '../catalog';
import { PRODUCTS } from '../seedCatalogData';

test('empty filter contains the entire catalog exactly once in alphabetical groups', () => {
  const rows = browseSuggestions('', []);
  expect(rows).toHaveLength(PRODUCTS.length);
  expect(new Set(rows.map(row => row.key)).size).toBe(PRODUCTS.length);
  expect(new Set(rows.map(row => row.name))).toEqual(new Set(PRODUCTS.map(product => product.name)));
  const alphabet = new Intl.Collator('lb', { sensitivity: 'base', numeric: true });
  for (let i = 1; i < rows.length; i++) expect(alphabet.compare(rows[i - 1].name, rows[i].name)).toBeLessThanOrEqual(0);
});

test('no small suggestion cap truncates the filter', () => {
  const expected = PRODUCTS.filter(p => [p.name, ...p.aliases].some(name => normalizeProductName(name).includes('a')));
  expect(expected.length).toBeGreaterThan(20);
  expect(browseSuggestions('a', [])).toHaveLength(expected.length);
});

test('filters foreign aliases but displays the preferred catalog name', () => {
  expect(browseSuggestions('Kartoffeln', []).map(row => row.name)).toEqual(['Gromper']);
  expect(browseSuggestions('lait', []).some(row => row.name === 'Mëllech')).toBe(true);
});

test('accents, decomposed characters, and whitespace match; accented names use base-letter headings', () => {
  expect(browseSuggestions('  me\u0308llech  ', []).some(row => row.name === 'Mëllech')).toBe(true);
  expect(browseSuggestions('epicerie', ['Épicerie maison'])[0]).toMatchObject({ name: 'Épicerie maison', letter: 'E', recent: true });
  expect(browseSuggestions('bio mellech', ['Bio  Mëllech'])).toHaveLength(1);
});

test('personal names join the alphabet and catalog duplicates keep Recent controls', () => {
  const rows = browseSuggestions('', ['Zzz custom', 'Apel', 'Aaa custom']);
  expect(rows.filter(row => row.name === 'Apel')).toEqual([expect.objectContaining({ recent: true, category: 'Produce' })]);
  expect(rows[0].name).toBe('Aaa custom');
  expect(rows.at(-1)?.name).toBe('Zzz custom');
  expect(rows).toHaveLength(PRODUCTS.length + 2);
});

test('numbers and symbols are browsable under a final # group', () => {
  const rows = browseSuggestions('', ['123 bags', '!special']);
  expect(rows.slice(-2).every(row => row.letter === '#')).toBe(true);
});

test('an unknown product has no matches until it becomes a personal suggestion', () => {
  expect(browseSuggestions('Plastiktut', [])).toEqual([]);
  expect(browseSuggestions('Plastiktut', ['Plastiktut'])).toEqual([expect.objectContaining({ name: 'Plastiktut', recent: true })]);
});

test('exact matches distinguish partial names and normalize catalog aliases and Recent names', () => {
  expect(browseSuggestions('glace', []).length).toBeGreaterThan(0);
  expect(hasExactSuggestion('glace', [])).toBe(false);
  expect(hasExactSuggestion('  AERDBIERSGLACE ', [])).toBe(true);
  expect(hasExactSuggestion('Milch', [])).toBe(true);
  expect(hasExactSuggestion('glace', ['Glace maison'])).toBe(false);
  expect(hasExactSuggestion('  GLACE ', ['Glace'])).toBe(true);
  expect(hasExactSuggestion('glace', [])).toBe(false);
  expect(hasExactSuggestion('bio mellech', ['Bio  Mëllech'])).toBe(true);
  expect(hasExactSuggestion('   ', [])).toBe(false);
});

test('reopening and repeated normalized searches reuse prepared results', () => {
  const first = browseSuggestions('', ['Plastiktut']);
  expect(browseSuggestions('', ['Plastiktut'])).toBe(first);
  const milk = browseSuggestions('Mëllech', ['Plastiktut']);
  expect(browseSuggestions('  mellech  ', ['Plastiktut'])).toBe(milk);
});

test('cached results refresh after Recent rename, forgetting, and Undo', () => {
  expect(browseSuggestions('bags', ['Old bags']).map(row => row.name)).toEqual(['Old bags']);
  expect(browseSuggestions('bags', ['New bags']).map(row => row.name)).toEqual(['New bags']);
  expect(browseSuggestions('bags', [])).toEqual([]);
  expect(browseSuggestions('bags', ['New bags']).map(row => row.name)).toEqual(['New bags']);
  expect(browseSuggestions('Apel', ['Apel']).find(row => row.name === 'Apel')?.recent).toBe(true);
  expect(browseSuggestions('Apel', []).find(row => row.name === 'Apel')?.recent).toBe(false);
});

test('evicting old searches never truncates the complete catalog', () => {
  const all = browseSuggestions('', []);
  for (const letter of 'abcdefghijklmnop') browseSuggestions(letter, []);
  expect(browseSuggestions('', [])).toEqual(all);
});
