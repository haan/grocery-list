import type { GroceryList } from './list';
import { exactProduct, matchingProducts, normalizeProductName } from './catalog';
import { inferCategory } from './categories';
import { mergeRecordSet } from '../sync/mergeRecordSet';

export interface AislePreference {
  id: string;
  category: string;
  updatedAt: number;
  deletedAt?: number;
}

export function preferenceKey(name: string): string {
  const product = exactProduct(name);
  return product ? `product:${product.id}` : `name:${normalizeProductName(name)}`;
}

/** Accept unknown product IDs so newer catalogs can interoperate with older ones. */
export function sanitizePreferences(raw: unknown): AislePreference[] {
  if (!Array.isArray(raw)) return [];
  const valid: AislePreference[] = [];
  const timestamp = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
  for (const p of raw) {
    if (!p || typeof p !== 'object' || typeof p.id !== 'string' ||
        !/^(product:lod:.+|name:.+)$/u.test(p.id) ||
        (p.id.startsWith('name:') && p.id.slice(5) !== normalizeProductName(p.id.slice(5))) ||
        typeof p.category !== 'string' || !p.category.trim() ||
        !timestamp(p.updatedAt) || (p.deletedAt != null && !timestamp(p.deletedAt))) continue;
    valid.push({ id: p.id, category: p.category, updatedAt: p.updatedAt,
      ...(p.deletedAt != null ? { deletedAt: p.deletedAt } : {}) });
  }
  return mergeRecordSet([], valid).sort((a,b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function learnedCategory(list: GroceryList, name: string): string | undefined {
  const preferences = list.aislePreferences ?? [];
  const lookup = (id: string) => {
    const p = preferences.find(p => p.id === id);
    return p && p.deletedAt == null && list.categoryOrder.includes(p.category) ? p.category : undefined;
  };
  const fullName = lookup(`name:${normalizeProductName(name)}`);
  if (fullName) return fullName;
  const products = matchingProducts(name);
  // Do not learn/apply a product identity when the input has multiple meanings.
  if (products.length === 1) return lookup(`product:${products[0].id}`);
  return undefined;
}

export function assignedCategory(list: GroceryList, name: string, supplied?: string): string {
  return learnedCategory(list, name) ?? supplied ?? inferCategory(name);
}
