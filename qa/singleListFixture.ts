import { newSecret } from '../src/sync/crypto';
/** Test-only installation fixtures. Production creates its list in the atomic
 * database migration. Sync simulations start after the initial snapshot gate;
 * the asynchronous join/adoption gate is covered separately. */
import { makeList, type GroceryList } from '../src/data/list';
import type { useListsStore } from '../src/store/lists';

export function seedList(store: typeof useListsStore, name?: string): string {
  const at = Date.now();
  const list = { ...makeList(name), createdAt: at, updatedAt: at, nameUpdatedAt: at, categoryOrderUpdatedAt: at };
  store.setState({ lists: [list], hydrated: true, pendingJoin: false, transitioning: false });
  return list.id;
}
export function pairedFixture(store: typeof useListsStore, secret: string, snapshot?: GroceryList): string {
  const at = Date.now();
  const local = { ...makeList(), createdAt: at, updatedAt: at, nameUpdatedAt: at, categoryOrderUpdatedAt: at };
  const list = { ...(snapshot ?? local), id: local.id, nameUpdatedAt: snapshot?.nameUpdatedAt ?? 0,
    shareIdentity: { secret, createdAt: Date.now() } };
  store.setState({ lists: [list], hydrated: true, pendingJoin: false, transitioning: false });
  return list.id;
}

export function sharedFixture(store: typeof useListsStore, id: string): string {
  const secret = newSecret();
  store.setState(s => ({ lists: s.lists.map(l => l.id === id ? { ...l, shareIdentity: { secret, createdAt: Date.now() } } : l) }));
  return secret;
}
