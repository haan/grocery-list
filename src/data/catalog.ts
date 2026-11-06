import type { Category } from './categories';
import { PRODUCTS } from './seedCatalogData';

export interface CatalogProduct {
  id: string;
  name: string;
  category: Category;
  aliases: readonly string[];
}

/** Matching only: never rewrite the user's stored item name. */
export function normalizeProductName(name: string): string {
  return name.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().trim().replace(/\s+/gu, ' ');
}

const index = new Map<string, CatalogProduct[]>();
for (const product of PRODUCTS) {
  for (const alias of new Set([product.name, ...product.aliases].map(normalizeProductName))) {
    index.set(alias, [...(index.get(alias) ?? []), product]);
  }
}

export function exactProduct(name: string): CatalogProduct | undefined {
  const matches = index.get(normalizeProductName(name));
  return matches?.length === 1 ? matches[0] : undefined;
}

/** Token boundaries prevent e.g. 'Ee' matching inside an unrelated word. */
export function matchingProducts(name: string): CatalogProduct[] {
  const normalized = normalizeProductName(name);
  const exact = index.get(normalized);
  if (exact) return exact;
  const tokens = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  let best = 0;
  const found = new Map<string, CatalogProduct>();
  for (const [alias, products] of index) {
    const words = alias.match(/[\p{L}\p{N}]+/gu) ?? [];
    if (!words.length || words.length < best) continue;
    const matches = tokens.some((_, i) => words.every((word, j) => tokens[i + j] === word));
    if (!matches) continue;
    if (words.length > best) { found.clear(); best = words.length; }
    for (const product of products) found.set(product.id, product);
  }
  return [...found.values()];
}

export function catalogCategory(name: string): Category {
  const categories = new Set(matchingProducts(name).map(p => p.category));
  return categories.size === 1 ? [...categories][0] : 'Other';
}
