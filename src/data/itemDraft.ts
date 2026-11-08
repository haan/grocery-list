import { assignedCategory, learnedCategory, preferenceKey, sanitizePreferences } from './aislePreferences';
import { findActiveByName, MAX_QTY, normalizeItemName, type GroceryItem, type GroceryList } from './list';

/** Ephemeral form state: never persisted or published before confirmation. */
export interface ItemDraft {
  listId: string;
  mode: 'create' | 'edit' | 'readd';
  original?: GroceryItem;
  initialName: string;
  suppliedCategory?: string;
  name: string;
  quantity: string;
  note: string;
  category: string;
  explicitCategory: boolean;
}

export type DraftError = 'name' | 'quantity' | 'duplicate' | 'deleted' | 'aisle' | 'list';
export type DraftResult = { ok: true; item: GroceryItem; added: boolean } | { ok: false; error: DraftError };

export function createItemDraft(list: GroceryList, selection: { name?: string; category?: string; itemId?: string }): ItemDraft {
  const original = selection.itemId
    ? list.items.find(i => i.id === selection.itemId && i.deletedAt == null)
    : findActiveByName(list, selection.name ?? '');
  const mode = original ? (!selection.itemId && original.checked ? 'readd' : 'edit') : 'create';
  const name = original?.name ?? selection.name ?? '';
  return {
    listId: list.id, mode, original: original ? { ...original } : undefined,
    initialName: name, suppliedCategory: selection.category,
    name, quantity: String(mode === 'edit' ? original!.quantity : 1),
    note: original?.note ?? '',
    category: original ? (mode === 'edit' ? original.category : learnedCategory(list, name) ?? original.category)
      : assignedCategory(list, name, selection.category),
    explicitCategory: false,
  };
}

export function validQuantity(value: string): boolean {
  return /^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= MAX_QTY;
}

export function renameDraft(draft: ItemDraft, name: string, list: GroceryList): ItemDraft {
  const unchangedName = name.trim() === draft.initialName;
  const originalCategory = unchangedName && draft.original
    ? draft.mode === 'readd'
      ? learnedCategory(list, name) ?? draft.original.category
      : draft.original.category
    : undefined;
  return { ...draft, name, category: draft.explicitCategory ? draft.category
    : originalCategory ?? assignedCategory(list, name, unchangedName ? draft.suppliedCategory : undefined) };
}

/** Apply only edited fields to the latest snapshot. No clock/ID/storage side effects on failure. */
export function applyItemDraft(list: GroceryList, draft: ItemDraft, stamp: () => number, id: () => string):
  { result: DraftResult; list?: GroceryList } {
  const fail = (error: DraftError) => ({ result: { ok: false, error } as DraftResult });
  if (list.id !== draft.listId) return fail('list');
  if (!draft.name.trim()) return fail('name');
  if (!validQuantity(draft.quantity)) return fail('quantity');
  const live = draft.original ? list.items.find(i => i.id === draft.original!.id && i.deletedAt == null) : undefined;
  if (draft.original && !live) return fail('deleted');
  const nameChanged = draft.name.trim() !== draft.initialName;
  const name = live && !nameChanged ? live.name : draft.name.trim();
  if (list.items.some(i => i.deletedAt == null && i.id !== live?.id && normalizeItemName(i.name) === normalizeItemName(name))) return fail('duplicate');

  const order = list.categoryOrder;
  // The UI's selected aisle must still exist; a deleted aisle is never recreated.
  if (!order.includes(draft.category)) return fail('aisle');
  let category = live?.category ?? draft.category;
  if (draft.explicitCategory) category = draft.category;
  else if (!live || nameChanged) category = assignedCategory(list, name, nameChanged ? undefined : draft.suppliedCategory);
  else if (draft.mode === 'readd') category = learnedCategory(list, name) ?? live.category;
  if (!order.includes(category)) return fail('aisle');
  const time = stamp();
  const quantity = live && draft.mode === 'edit' && draft.quantity === String(draft.original!.quantity)
    ? live.quantity : Number(draft.quantity);
  const note = live && draft.note === (draft.original!.note ?? '') ? live.note : draft.note.trim() || undefined;
  const contentChanged = !live || name !== live.name || quantity !== live.quantity || note !== live.note || category !== live.category;
  const item: GroceryItem = {
    ...(live ?? { id: id(), addedAt: time, checked: false, checkedUpdatedAt: time }),
    checkedUpdatedAt: live?.checkedUpdatedAt ?? live?.updatedAt ?? time,
    name, quantity, note, category, updatedAt: contentChanged ? time : live!.updatedAt,
    ...(draft.mode === 'readd' ? { checked: false, checkedAt: undefined, checkedUpdatedAt: time } : {}),
  };
  const preferences = draft.explicitCategory
    ? sanitizePreferences([...(list.aislePreferences ?? []).filter(p => p.id !== preferenceKey(name)),
      { id: preferenceKey(name), category, updatedAt: time }]) : list.aislePreferences;
  return { result: { ok: true, item, added: draft.mode !== 'edit' }, list: {
    ...list, updatedAt: time, categoryOrder: order,
    categoryOrderUpdatedAt: list.categoryOrderUpdatedAt ?? list.updatedAt, aislePreferences: preferences,
    items: live ? list.items.map(i => i.id === live.id ? item : i) : [...list.items, item],
  } };
}
