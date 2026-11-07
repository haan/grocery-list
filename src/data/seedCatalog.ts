/** Luxembourgish shopping suggestions, independent of the UI language. */
import type { Category } from './categories';
import { PRODUCTS } from './seedCatalogData';
import { normalizeProductName } from './catalog';
export interface SeedItem { name: string; category: Category }
const items: SeedItem[] = PRODUCTS.map(({name, category}) => ({name, category}));
export function seedItemsForLocale(_locale: string): SeedItem[] { return items; }
const starterIds = ["lod:GROMPER1UNI1","lod:TOMAT1UNI2","lod:APEL1UNI1","lod:MELLECH1UNI1","lod:EE1UNI1","lod:BOTTER1UNI1","lod:BROUT1UNI1","lod:BAGUETTE1UNI1","lod:POULET1UNI1","lod:MIEL1UNI1","lod:RAIS1UNI2","lod:WAASSER2UNI1","lod:KAFFI1UNI2","lod:TOILETTEPABEIER1UNI1","lod:SPULLMETTEL1UNI1","lod:ZANNSEEF1UNI1"];
const starters: SeedItem[] = starterIds.flatMap(id => PRODUCTS.filter(p => p.id === id).map(({name, category}) => ({name, category})));
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
