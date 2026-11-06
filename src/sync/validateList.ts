import type { GroceryList } from '../data/list';

const stamp = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const optionalStamp = (v: unknown) => v == null || stamp(v);

/** Validate before clock observation or first-snapshot adoption. Legacy optional
 * clocks and preferences remain optional on the wire. */
export function isListSnapshot(value: unknown, secret: string): value is GroceryList {
  if (!value || typeof value !== 'object') return false;
  const l = value as GroceryList;
  return !('_sync' in l) && typeof l.id === 'string' && typeof l.name === 'string'
    && l.shareIdentity?.secret === secret && stamp(l.shareIdentity.createdAt)
    && stamp(l.createdAt) && stamp(l.updatedAt) && optionalStamp(l.nameUpdatedAt)
    && Array.isArray(l.categoryOrder) && l.categoryOrder.length > 0
    && l.categoryOrder.every(c => typeof c === 'string' && c.length > 0)
    && Array.isArray(l.items) && l.items.every(i => i && typeof i.id === 'string'
      && typeof i.name === 'string' && typeof i.category === 'string'
      && Number.isInteger(i.quantity) && i.quantity >= 1 && i.quantity <= 99
      && typeof i.checked === 'boolean' && (i.note == null || typeof i.note === 'string')
      && stamp(i.addedAt) && stamp(i.updatedAt) && optionalStamp(i.checkedUpdatedAt)
      && optionalStamp(i.checkedAt) && optionalStamp(i.deletedAt));
}
