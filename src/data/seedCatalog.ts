/** Luxembourgish shopping suggestions, independent of the UI language. */
import type { Category } from './categories';
import { PRODUCTS } from './seedCatalogData';
import { normalizeProductName } from './catalog';
export interface SeedItem { name: string; category: Category }
const items: SeedItem[] = PRODUCTS.map(({name, category}) => ({name, category}));
export function seedItemsForLocale(_locale: string): SeedItem[] { return items; }
const starterNames = ['Gromper', 'Tomat', 'Apel', 'Mëllech', 'Ee', 'Botter', 'Brout', 'Baguette', 'Poulet', 'Miel', 'Räis', 'Waasser', 'Kaffi', 'Toilettëpabeier', 'Spullmëttel', 'Zännseef'];
const starters = starterNames.flatMap(name => items.filter(p => p.name === name));
export function starterItemsForLocale(_locale: string): SeedItem[] { return starters; }
export function suggestSeed(query: string, _locale: string, exclude: Set<string>, limit = 20): SeedItem[] {
  const q = normalizeProductName(query);
  if (!q || limit <= 0) return [];
  const excluded = new Set([...exclude].map(normalizeProductName));
  const prefix: SeedItem[] = [], contains: SeedItem[] = [];
  for (const product of PRODUCTS) {
    const aliases = [product.name, ...product.aliases].map(normalizeProductName);
    if (aliases.some(a => excluded.has(a))) continue;
    if (aliases.some(a => a.startsWith(q))) prefix.push(product);
    else if (aliases.some(a => a.includes(q))) contains.push(product);
  }
  return [...prefix, ...contains].slice(0, limit).map(({name, category}) => ({name, category}));
}
