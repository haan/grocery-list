import { useListsStore } from '../store/lists';
import type { GroceryList } from '../data/list';
import { authorSeed, channelId, seal, open } from './crypto';
import { logEvent, logWarn } from '../feedback/log';
import { DropBoxTransport } from './transport';
import {
  markConnected,
  markDelivered,
  markReceived,
  markSent,
  dropStatus,
} from './status';

/** A control message asking peers to re-publish their current state. Encrypted
 *  like everything else; distinguished from a state message by `_sync` (a state
 *  message is a bare GroceryList, which has `shareIdentity` and no `_sync`). */
const HELLO = JSON.stringify({ _sync: 'hello' });
/** Don't re-announce more than this often per channel (relays may report
 *  several sockets opening near-simultaneously). */
const HELLO_DEBOUNCE_MS = 3000;

/** The slice of DropBoxTransport the engine drives. Named so a test can inject
 *  a fake (see __setTransportFactory) — the production transport is created and
 *  torn down entirely inside this module, so the wiring is otherwise unreachable. */
export interface EngineTransport {
  start(): void;
  /** Live only (forwarded to peers listening now, stored nowhere). */
  publish(ciphertext: string): void;
  /** Deposited: the drop box keeps this device's latest copy of `slot` for
   *  anyone who connects later — and fans it out live too. */
  publishStored(ciphertext: string, slot: string): void;
  close(): void;
}

type TransportFactory = (
  channel: string,
  onMessage: (ciphertext: string, at?: number) => void,
  onReconnect: () => void,
  onStatus: (openRelays: number) => void,
  onPublishResult?: (delivered: boolean, reason: string) => void,
  seed?: Uint8Array
) => EngineTransport;

let makeTransport: TransportFactory = (
  channel,
  onMessage,
  onReconnect,
  onStatus,
  onPublishResult,
  seed
) =>
  new DropBoxTransport(channel, onMessage, onReconnect, onStatus, onPublishResult, seed);

/** TEST-ONLY seam: swap the transport factory (e.g. for a recording fake) and
 *  get back a restore fn. Production never calls this — the default factory
 *  builds the real DropBoxTransport. */
export function __setTransportFactory(factory: TransportFactory): () => void {
  const prev = makeTransport;
  makeTransport = factory;
  return () => {
    makeTransport = prev;
  };
}

interface Channel {
  transport: EngineTransport;
  lastSent: string;
  timer: ReturnType<typeof setTimeout> | null;
  lastHelloAt: number;
}

const channels = new Map<string, Channel>();
let unsub: (() => void) | null = null;

function sharedSecret(l: GroceryList): string | undefined {
  return l.shareIdentity?.secret;
}

/** A short handle for a shared list in the diagnostic log. NEVER the secret —
 *  this is a prefix of the channel id, which is already public on the relay, so
 *  it correlates two paired devices' logs without revealing the key or anything
 *  on the list. ("Both phones say connected but only one ever received" is the
 *  single hardest shared-list report to answer without this.) */
function chTag(secret: string): string {
  return channelId(secret).slice(0, 8);
}

/** @param deviceSalt this device's own local id for the list — devices never
 *  share one, so it makes the relay signing key (and so the stored slot) per
 *  device without persisting anything new. */
function ensureChannel(secret: string, deviceSalt: string): Channel {
  let ch = channels.get(secret);
  if (ch) return ch;
  const active = () => channels.get(secret) === ch && !useListsStore.getState().transitioning
    && useListsStore.getState().lists[0]?.shareIdentity?.secret === secret;
  const transport = makeTransport(
    channelId(secret),
    (ct, at) => { if (active()) receive(secret, ct, at); },
    () => { if (active()) onReconnect(secret); },
    (openRelays) => {
      if (!active()) return;
      logEvent('sync', openRelays > 0 ? 'connected' : 'offline', {
        ch: chTag(secret),
        relays: openRelays,
      });
      markConnected(secret, openRelays > 0);
    },
    (delivered) => {
      if (!active()) return;
      // A send nobody accepted: the socket is up, but what we just published
      // never left the device — the exact shape of "I ticked it and the other
      // phone never saw it", and until now the one sync outcome that left no
      // trace at all. The relay's `reason` is deliberately NOT logged: it is
      // free text from a third party, and every field in this log is a scalar
      // we control.
      if (!delivered) {
        logWarn('sync', 'publish was not delivered', { ch: chTag(secret), delivered: false });
      }
      markDelivered(secret, delivered);
    },
    authorSeed(secret, deviceSalt)
  );
  ch = { transport, lastSent: '', timer: null, lastHelloAt: 0 };
  channels.set(secret, ch);
  transport.start();
  return ch;
}

/** Handle one decrypted peer message: a hello (→ re-publish our state) or a
 *  state copy (→ merge it). `at` is when the peer published it — for a slot
 *  replayed from the drop box that can be days ago, and that is what "last
 *  heard from the other phone" must say. */
function receive(secret: string, ct: string, at?: number): void {
  const heardAt = at ?? Date.now();
  const json = open(secret, ct);
  if (!json) {
    // Undecryptable on a channel we hold the key for: a partner on a different
    // build, or a genuinely corrupt frame. Silent until now, and indistinguishable
    // from "nothing ever arrived" — the two need very different answers.
    logWarn('sync', 'could not decrypt a message', { ch: chTag(secret) });
    return;
  }
  let obj: unknown;
  try {
    obj = JSON.parse(json);
  }
  catch {
    return; // malformed — next publish re-converges
  }
  if (obj && typeof obj === 'object') {
    const sync = (obj as { _sync?: string })._sync;
    if (sync === 'hello') {
      // A newcomer: re-publish our current list state.
      forcePublish(secret);
      return;
    }
    // Unsupported control messages must never be interpreted as list state.
    if ('_sync' in obj) return;
  }
  const remote = obj as GroceryList;
  if (remote?.shareIdentity?.secret === secret) {
    // mergeRemoteList folds the remote clock in before merging (see clock.ts).
    logEvent('sync', 'received list state', {
      ch: chTag(secret),
      items: Array.isArray(remote.items) ? remote.items.length : 0,
    });
    const id = useListsStore.getState().lists[0]?.id;
    const result = useListsStore.getState().mergeRemoteList(remote);
    const accepted = (ok: boolean) => {
      const state = useListsStore.getState();
      if (ok && !state.transitioning && state.lists[0]?.id === id
        && state.lists[0]?.shareIdentity?.secret === secret) markReceived(secret, heardAt);
    };
    if (result instanceof Promise) void result.then(accepted);
    else accepted(result);
  }
}

/** On (re)connect, both PUSH our current state (so a peer that is already
 *  online converges to our latest — e.g. the checks we just made) and PULL via
 *  hello (so peers push us theirs). Both directions are needed: hello alone
 *  only fetches, so a device that reconnects while its partner is already
 *  online would never re-share its own state. */
function onReconnect(secret: string): void {
  forcePublish(secret);
  sendHello(secret);
}

/** Announce ourselves so a peer re-publishes its current state. Debounced. */
function sendHello(secret: string): void {
  const ch = channels.get(secret);
  if (!ch) return;
  const t = Date.now();
  if (t - ch.lastHelloAt < HELLO_DEBOUNCE_MS) return;
  ch.lastHelloAt = t;
  ch.transport.publish(seal(secret, HELLO));
}

/** Deposit our current full state immediately, bypassing the change-dedupe —
 *  used to answer a peer's hello (its copy may be empty/stale even though ours
 *  hasn't changed since we last sent) and on every (re)connect, so the drop
 *  box always holds this device's latest copy. */
function forcePublish(secret: string): void {
  if (useListsStore.getState().pendingJoin || useListsStore.getState().transitioning) return;
  const ch = channels.get(secret);
  if (!ch) return;
  const list = useListsStore
    .getState()
    .lists.find((l) => sharedSecret(l) === secret);
  if (!list) return;
  // Cancel any pending debounced publish: it captured an OLDER snapshot, and
  // letting it fire after this one would re-send stale state.
  if (ch.timer) {
    clearTimeout(ch.timer);
    ch.timer = null;
  }
  const payload = JSON.stringify(list);
  ch.lastSent = payload;
  ch.transport.publishStored(seal(secret, payload), 'list');
  markSent(secret, Date.now());
}

function publish(secret: string, list: GroceryList): void {
  const ch = ensureChannel(secret, list.id);
  if (useListsStore.getState().pendingJoin) { sendHello(secret); return; }
  const payload = JSON.stringify(list);
  if (payload === ch.lastSent) return; // nothing changed since last send
  if (ch.timer) {
    clearTimeout(ch.timer);
  }
  ch.timer = setTimeout(() => {
    if (channels.get(secret) !== ch || useListsStore.getState().transitioning || useListsStore.getState().pendingJoin) return;
    ch.lastSent = payload;
    ch.transport.publishStored(seal(secret, payload), 'list');
    markSent(secret, Date.now());
  }, 700);
}

/** Force an immediate full exchange for one shared list (the UI's manual
 *  "resync" affordance): push our state and ask peers for theirs. */
export function resyncNow(secret: string): void {
  onReconnect(secret);
}

function reconcile(lists: GroceryList[]): void {
  if (useListsStore.getState().transitioning) lists = [];
  const live = new Set<string>();
  for (const l of lists) {
    const secret = sharedSecret(l);
    if (!secret) continue;
    live.add(secret);
    publish(secret, l);
  }
  // Close channels for lists that are gone / no longer shared.
  for (const [secret, ch] of channels) {
    if (!live.has(secret)) {
      if (ch.timer) {
        clearTimeout(ch.timer);
      }
      ch.transport.close();
      channels.delete(secret);
      dropStatus(secret);
    }
  }
}

/** Start once after the store has hydrated (App.tsx). Idempotent. */
export function startSyncEngine(): void {
  if (unsub) return;
  reconcile(useListsStore.getState().lists);
  unsub = useListsStore.subscribe((state) => reconcile(state.lists));
}

/** Push current state immediately on every channel, skipping the debounce.
 *  Call when the app is about to background: the 700ms publish debounce would
 *  otherwise be suspended mid-wait, so a check made right before switching apps
 *  never leaves the device. Best-effort — sockets may be closing. */
export function flushSyncEngine(): void {
  for (const secret of channels.keys()) {
    const ch = channels.get(secret);
    if (ch?.timer) {
      clearTimeout(ch.timer);
      ch.timer = null;
    }
    forcePublish(secret);
  }
}

export function stopSyncEngine(): void {
  if (unsub) {
    unsub();
    unsub = null;
  }
  for (const [secret, ch] of channels) {
    dropStatus(secret);
    if (ch.timer) {
      clearTimeout(ch.timer);
    }
    ch.transport.close();
  }
  channels.clear();
}
