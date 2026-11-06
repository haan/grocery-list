import { seedItemsForLocale, starterItemsForLocale, suggestSeed } from '../seedCatalog';
import { PRODUCTS } from '../seedCatalogData';
import { isBuiltinCategory } from '../categories';
import { normalizeProductName } from '../catalog';

test('catalog has unique identities and names, valid aisles, and aliases', () => {
  expect(new Set(PRODUCTS.map(p => p.id)).size).toBe(PRODUCTS.length);
  expect(new Set(PRODUCTS.map(p => normalizeProductName(p.name))).size).toBe(PRODUCTS.length);
  for (const p of PRODUCTS) {
    expect(p.id).toMatch(/^lod:/);
    expect(isBuiltinCategory(p.category)).toBe(true);
    expect(p.aliases.length).toBeGreaterThan(0);
  }
  expect(PRODUCTS.some(p => p.category === 'Household')).toBe(true);
  expect(PRODUCTS.some(p => p.category === 'Personal care')).toBe(true);
});
test('suggestions and starters are Luxembourgish in every interface language', () => {
  for (const locale of ['en', 'es', 'de', 'fr', 'it', 'pt-BR', 'ja']) {
    expect(seedItemsForLocale(locale)).toEqual(seedItemsForLocale('en'));
    expect(starterItemsForLocale(locale)).toContainEqual({name: 'Mëllech', category: 'Dairy & eggs'});
  }
});
test('matches accent-free names and foreign aliases, deduplicating by product', () => {
  expect(suggestSeed('mellech', 'en', new Set())[0].name).toBe('Mëllech');
  expect(suggestSeed('Kartoffeln', 'en', new Set()).map(p=>p.name)).toEqual(['Gromper']);
  const results = suggestSeed('champignon', 'en', new Set());
  expect(results.filter(p=>p.name === 'Champignon')).toHaveLength(1);
  expect(suggestSeed('lait', 'en', new Set(['MELLECH'])).some(p=>p.name === 'Mëllech')).toBe(false);
});
test('bounds results and excludes empty queries', () => {
  expect(suggestSeed('', 'en', new Set())).toEqual([]);
  expect(suggestSeed('a', 'en', new Set(), 3)).toHaveLength(3);
  expect(suggestSeed('a', 'en', new Set(), 0)).toEqual([]);
});
