/** Stable persisted aisle identifiers, Luxembourgish labels, and LOD inference. */

import { catalogCategory } from './catalog';

/** Built-in keys remain unchanged for installed lists and sync compatibility. */
export type BuiltinCategory =
  | 'Produce'
  | 'Bakery'
  | 'Meat & seafood'
  | 'Dairy & eggs'
  | 'Frozen'
  | 'Pantry'
  | 'Snacks'
  | 'Beverages'
  | 'Household'
  | 'Personal care'
  | 'Other';

/** Custom aisles use their literal name as their key and display label. */
export type Category = string;

/** Product and aisle language is independent of the interface language. */
const CATEGORY_LABEL_LB: Record<BuiltinCategory, string> = {
  Produce: 'Uebst a Geméis', Bakery: 'Brout a Gebäck',
  'Meat & seafood': 'Fleesch a Fësch', 'Dairy & eggs': 'Mëllechprodukter an Eeër',
  Frozen: 'Déifkillprodukter', Pantry: 'Vorrat', Snacks: 'Snacks a Séissegkeeten',
  Beverages: 'Gedrénks', Household: 'Stot', 'Personal care': 'Kierperfleeg', Other: 'Aneres',
};

/** Is this key one of the fixed, code-defined aisles? (vs. a user custom one) */
export function isBuiltinCategory(category: string): category is BuiltinCategory {
  return Object.prototype.hasOwnProperty.call(CATEGORY_LABEL_LB, category);
}

/** Built-ins display in Luxembourgish; custom names are untouched. */
export function categoryLabel(category: Category): string {
  return isBuiltinCategory(category) ? CATEGORY_LABEL_LB[category] : category;
}

/** Canonical default aisle order. A list copies this at creation and may then
 *  reorder its own copy (build step 3) without affecting other lists. */
export const DEFAULT_CATEGORY_ORDER: BuiltinCategory[] = [
  'Produce',
  'Bakery',
  'Meat & seafood',
  'Dairy & eggs',
  'Frozen',
  'Pantry',
  'Snacks',
  'Beverages',
  'Household',
  'Personal care',
  'Other',
];

/** Catalog recognition is independent of the interface language. */
export function inferCategory(name: string, _locale: string = 'en'): Category {
  return catalogCategory(name);
}
