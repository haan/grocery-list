/**
 * Sync engine wiring (sync/index.ts) — the layer where the two shipped
 * shared-list defects actually lived (cold-start hello backfill, bidirectional
 * reconnect push, debounced force-publish, unsupported control messages,
 * receive() dispatch). The merge primitives are exemplary-tested elsewhere
 * (syncSim/mergeRecordSet); this pins the ENGINE, which was untested because
 * DropBoxTransport is created inside the module and can't be reached.
 *
 * The __setTransportFactory seam swaps in a recording fake so we can drive the
 * onMessage / onReconnect callbacks and inspect (decrypt) what the engine
 * publishes. Everything flows through the REAL crypto (seal/open) and the REAL
 * stores, so this exercises the production dispatch, not a re-implementation.
 */

// Stub the SQLite-backed persistence so the stores load in node (expo-sqlite
// can't). Persist is fire-and-forget; the in-memory state is the SUT. Mirrors
// src/store/__tests__/aisleLearning.test.ts.
// The real DropBoxTransport pulls in @noble/* (pure ESM jest doesn't transform)
// and opens WebSockets. The engine never constructs it here — __setTransportFactory
// injects a fake — so stub the module out to keep the import graph node-loadable.
jest.mock('../transport', () => ({
  DropBoxTransport: class {
    start() {}
    publish() {}
    close() {}
  },
  RELAYS: [],
}));

jest.mock('../../store/db', () => ({
  loadAllLists: jest.fn(async () => []),
  replaceCurrentList: jest.fn(async () => {}),
  saveList: jest.fn(async () => {}),
  deleteListFromDb: jest.fn(async () => {}),
  putTombstone: jest.fn(async () => {}),
  removeTombstone: jest.fn(async () => {}),
  getSyncMeta: jest.fn(async () => null),
  setSyncMeta: jest.fn(async () => {}),
}));

import { useListsStore } from '../../store/lists';
import { channelId, newSecret, seal, open } from '../crypto';
import { clear as clearLog, serializeCurrent } from '../../feedback/log';
import { useSyncStatusStore } from '../status';
import {
  startSyncEngine,
  stopSyncEngine,
  flushSyncEngine,
  resyncNow,
  __setTransportFactory,
  type EngineTransport,
} from '../index';
import type { GroceryList } from '../../data/list';

const SECRET = newSecret();

/** Recording fake — captures published ciphertext and exposes the engine's
 *  callbacks so a test can simulate an inbound message / reconnect. */
class FakeTransport implements EngineTransport {
  published: string[] = [];
  started = false;
  closed = false;
  constructor(
    public channel: string,
    public onMessage: (ct: string) => void,
    public onReconnect: () => void,
    public onStatus: (openRelays: number) => void,
    public onPublishResult?: (delivered: boolean, reason: string) => void
  ) {}
  start() {
    this.started = true;
  }
  publish(ct: string) {
    this.published.push(ct);
  }
  /** Deposits land in the same recording: these tests pin WHAT the engine
   *  sends and when; storeAndForward.test.tsx pins the live/stored split. */
  publishStored(ct: string) {
    this.published.push(ct);
  }
  close() {
    this.closed = true;
  }
  /** Decrypt each published message to a parsed object for assertions. */
  decoded(): any[] {
    return this.published.map((ct) => JSON.parse(open(SECRET, ct) as string));
  }
  deliver(plaintext: string) {
    this.onMessage(seal(SECRET, plaintext));
  }
}

let created: FakeTransport[];
let restore: () => void;

function sharedList(items: GroceryList['items'] = []): GroceryList {
  const at = 1000;
  return {
    id: 'l1',
    name: 'Groceries',
    nameUpdatedAt: at,
    items,
    categoryOrder: ['Other'],
    createdAt: at,
    updatedAt: at,
    shareIdentity: { secret: SECRET, createdAt: at },
  };
}

function item(id: string, updatedAt = 1000) {
  return {
    id,
    name: id,
    quantity: 1,
    category: 'Other' as const,
    checked: false,
    addedAt: updatedAt,
    updatedAt,
  };
}

/** The same list with no share identity — an ordinary, private, unshared list. */
function soloList(items: GroceryList['items'] = []): GroceryList {
  const l = sharedList(items);
  delete l.shareIdentity;
  return l;
}

beforeEach(() => {
  created = [];
  restore = __setTransportFactory(
    (channel, onMessage, onReconnect, onStatus, onPublishResult) => {
      const t = new FakeTransport(channel, onMessage, onReconnect, onStatus, onPublishResult);
      created.push(t);
      return t;
    }
  );
  useListsStore.setState({ lists: [], hydrated: true, pendingJoin: false, transitioning: false });
  useSyncStatusStore.setState({ bySecret: {} });
  clearLog();
});

afterEach(() => {
  stopSyncEngine();
  restore();
  jest.useRealTimers();
});

/** The locally retained diagnostic lines. */
function logLines(): string[] {
  return serializeCurrent().split('\n');
}
/** The one report line mentioning `needle`, or undefined. */
function logLine(needle: string): string | undefined {
  return logLines().find((l) => l.includes(needle));
}
/** The short channel handle the engine tags every sync log line with. */
const CH_TAG = channelId(SECRET).slice(0, 8);

/** Just the peer-visible messages of one kind, decrypted. */
function messagesOfKind(t: FakeTransport, kind: 'state' | 'hello'): any[] {
  return t
    .decoded()
    .filter((m) => (kind === 'state' ? m?.shareIdentity && !m?._sync : m?._sync === kind));
}

describe('channel lifecycle', () => {
  test('a shared list opens exactly one started channel; a solo list opens none', () => {
    useListsStore.setState({ lists: [sharedList()], hydrated: true });
    startSyncEngine();
    expect(created).toHaveLength(1);
    expect(created[0].started).toBe(true);
  });
});

describe('hello handshake (cold-start backfill)', () => {
  test('an inbound hello force-publishes our current list only', () => {
    useListsStore.setState({ lists: [sharedList([item('milk')])], hydrated: true });
    startSyncEngine();
    created[0].published = []; // ignore the debounced reconcile publish

    created[0].deliver(JSON.stringify({ _sync: 'hello' }));

    const msgs = created[0].decoded();
    // Only list state is published immediately.
    expect(msgs).toHaveLength(1);
    const state = msgs.find((m) => m.shareIdentity && !m._sync);
    expect(state?.items?.some((it: any) => it.id === 'milk')).toBe(true);
  });
});

describe('reconnect (bidirectional)', () => {
  test('onReconnect pushes our state AND sends a hello to pull theirs', () => {
    useListsStore.setState({ lists: [sharedList([item('eggs')])], hydrated: true });
    startSyncEngine();
    created[0].published = [];

    created[0].onReconnect();

    const msgs = created[0].decoded();
    expect(msgs.some((m) => m.shareIdentity && !m._sync)).toBe(true); // pushed state
    expect(msgs.some((m) => m._sync === 'kits')).toBe(false);
    expect(msgs.some((m) => m._sync === 'hello')).toBe(true); // pulled via hello
  });
});

describe('debounced publish', () => {
  test('several rapid local edits coalesce into a single channel publish', () => {
    jest.useFakeTimers();
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();

    // Three quick edits within the debounce window.
    for (let n = 2; n <= 4; n++) {
      useListsStore.setState({
        lists: [sharedList([item('a'), item(`x${n}`, 1000 + n)])],
        hydrated: true,
      });
    }
    expect(created[0].published).toHaveLength(0); // nothing sent yet (still debouncing)

    jest.advanceTimersByTime(700);
    expect(created[0].published).toHaveLength(1); // coalesced to one send
  });
});

describe('receive() dispatch', () => {
  test.each(['kits', 'future-control', null])('ignores unsupported control %s even with valid list fields', (control) => {
    jest.useFakeTimers();
    useListsStore.setState({ lists: [sharedList([item('rice')])], hydrated: true });
    startSyncEngine();
    jest.advanceTimersByTime(700);
    const before = useListsStore.getState().lists;
    const status = { ...useSyncStatusStore.getState().bySecret };
    created[0].published = [];
    const remote = { ...sharedList([item('unwanted', 9000)]), _sync: control, kits: [{ id: 'old-kit' }] };
    created[0].deliver(JSON.stringify(remote));
    jest.advanceTimersByTime(1000);
    expect(useListsStore.getState().lists).toBe(before);
    expect(useSyncStatusStore.getState().bySecret).toEqual(status);
    expect(created[0].published).toEqual([]);
  });

  test('a peer state message with our secret is merged into the store', () => {
    useListsStore.setState({ lists: [sharedList([item('bread')])], hydrated: true });
    startSyncEngine();

    const remote = sharedList([item('bread'), item('butter', 5000)]);
    remote.id = 'peer-list-id'; // devices have different local ids; secret is the key
    created[0].deliver(JSON.stringify(remote));

    const merged = useListsStore.getState().lists[0];
    expect(merged.items.map((i) => i.id).sort()).toEqual(['bread', 'butter']);
  });

  test('an unknown _sync tag is ignored (forward wire-compat), no merge, no throw', () => {
    useListsStore.setState({ lists: [sharedList([item('rice')])], hydrated: true });
    startSyncEngine();
    const before = JSON.stringify(useListsStore.getState().lists);

    expect(() => created[0].deliver(JSON.stringify({ _sync: 'from-a-future-version', blob: 1 }))).not.toThrow();

    expect(JSON.stringify(useListsStore.getState().lists)).toBe(before);
  });

  test('a state message whose secret is not ours is ignored', () => {
    useListsStore.setState({ lists: [sharedList([item('rice')])], hydrated: true });
    startSyncEngine();
    const before = JSON.stringify(useListsStore.getState().lists);

    const foreign = sharedList([item('poison', 9000)]);
    foreign.shareIdentity = { secret: 'someone-elses-secret', createdAt: 1 };
    created[0].deliver(JSON.stringify(foreign));

    expect(JSON.stringify(useListsStore.getState().lists)).toBe(before);
  });

  test('garbage from a public relay is ignored, never thrown into the app', () => {
    useListsStore.setState({ lists: [sharedList([item('rice')])], hydrated: true });
    startSyncEngine();
    const before = JSON.stringify(useListsStore.getState().lists);

    // Anyone can push anything onto a public channel: text that decrypts but
    // isn't JSON, and bytes that don't decrypt at all.
    expect(() => created[0].deliver('<<not json at all>>')).not.toThrow();
    expect(() => created[0].onMessage('!!! not even base64 !!!')).not.toThrow();

    expect(JSON.stringify(useListsStore.getState().lists)).toBe(before);
  });
});

describe('unshared lists', () => {
  test('a solo list opens no channel (and does not crash the reconcile)', () => {
    useListsStore.setState({ lists: [soloList([item('milk')])], hydrated: true });
    startSyncEngine();
    expect(created).toHaveLength(0);
  });

  test('replacing a solo list with a shared list opens exactly one channel', () => {
    useListsStore.setState({
      lists: [sharedList([item('eggs')])],
      hydrated: true,
    });
    startSyncEngine();
    expect(created).toHaveLength(1);
  });

  test('unsharing a list closes its channel and forgets its status', () => {
    useListsStore.setState({ lists: [sharedList([item('milk')])], hydrated: true });
    startSyncEngine();
    created[0].onStatus(2);
    expect(useSyncStatusStore.getState().bySecret[SECRET].connected).toBe(true);

    // The user turns sharing off. The relay socket must not outlive it, and no
    // stale "Connected" may stay attached to a secret nothing listens on.
    useListsStore.setState({ lists: [soloList([item('milk')])], hydrated: true });

    expect(created[0].closed).toBe(true);
    expect(useSyncStatusStore.getState().bySecret[SECRET]).toBeUndefined();
  });
});

describe('engine lifecycle', () => {
  test('starting twice opens only one channel', () => {
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    startSyncEngine();
    expect(created).toHaveLength(1);
  });

  test('starting twice leaves no orphan subscription behind after stop', () => {
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    startSyncEngine();

    stopSyncEngine();
    created = [];

    // After stop, an edit must reach no transport at all. A second, unreleased
    // store subscription would quietly re-open a relay socket right here.
    useListsStore.setState({
      lists: [sharedList([item('a'), item('b', 2000)])],
      hydrated: true,
    });
    expect(created).toHaveLength(0);
  });

  test('stopping closes the open channel and stops publishing', () => {
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    const transport = created[0];

    stopSyncEngine();

    expect(transport.closed).toBe(true);
    created = [];
    useListsStore.setState({
      lists: [sharedList([item('a'), item('b', 2000)])],
      hydrated: true,
    });
    expect(created).toHaveLength(0);
    expect(transport.published).toHaveLength(0);
  });
});

describe('publish dedupe', () => {
  test('a store touch that changes nothing sends no second copy', () => {
    jest.useFakeTimers();
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    jest.advanceTimersByTime(700);
    expect(messagesOfKind(created[0], 'state')).toHaveLength(1);

    // Re-setting an identical list (a rehydrate, an unrelated re-render) must
    // not put another copy of the whole list on a public relay.
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    jest.advanceTimersByTime(700);
    expect(messagesOfKind(created[0], 'state')).toHaveLength(1);
  });
});

describe('flushSyncEngine (the app is backgrounding)', () => {
  test('an edit still inside the debounce window leaves the device immediately', () => {
    jest.useFakeTimers();
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    jest.advanceTimersByTime(700);
    created[0].published = [];

    // Check something off, then switch apps at once: the 700ms debounce is
    // about to be suspended mid-wait, which is how a check used to be stranded.
    useListsStore.setState({
      lists: [sharedList([item('a'), item('milk', 3000)])],
      hydrated: true,
    });
    expect(created[0].published).toHaveLength(0);

    flushSyncEngine();

    const state = messagesOfKind(created[0], 'state');
    expect(state).toHaveLength(1);
    expect(state[0].items.some((it: any) => it.id === 'milk')).toBe(true);

    // The suspended debounce must not then fire a second, older copy.
    const sent = created[0].published.length;
    jest.advanceTimersByTime(700);
    expect(created[0].published).toHaveLength(sent);
  });
});

describe('resyncNow (the tap-to-resync affordance)', () => {
  test('pushes our list and asks peers for theirs', () => {
    useListsStore.setState({ lists: [sharedList([item('eggs')])], hydrated: true });
    startSyncEngine();
    created[0].published = [];

    resyncNow(SECRET);

    expect(messagesOfKind(created[0], 'state')).toHaveLength(1);
    expect(messagesOfKind(created[0], 'hello')).toHaveLength(1);
  });

  test('answering a peer hello cancels the pending copy, so nothing stale lands', () => {
    jest.useFakeTimers();
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    jest.advanceTimersByTime(700);
    created[0].published = [];

    useListsStore.setState({
      lists: [sharedList([item('a'), item('bread', 3000)])],
      hydrated: true,
    });
    created[0].deliver(JSON.stringify({ _sync: 'hello' }));

    const sent = created[0].published.length;
    jest.advanceTimersByTime(700);
    expect(created[0].published).toHaveLength(sent);
  });

  test('two reconnects in quick succession announce us only once', () => {
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    created[0].published = [];

    // Relays often report several sockets opening at nearly the same moment.
    created[0].onReconnect();
    created[0].onReconnect();

    expect(messagesOfKind(created[0], 'hello')).toHaveLength(1);
  });
});

describe('connection status the bar reads', () => {
  test('no open relay reads as not connected; at least one reads as connected', () => {
    useListsStore.setState({ lists: [sharedList()], hydrated: true });
    startSyncEngine();

    created[0].onStatus(1);
    expect(useSyncStatusStore.getState().bySecret[SECRET].connected).toBe(true);

    created[0].onStatus(0);
    expect(useSyncStatusStore.getState().bySecret[SECRET].connected).toBe(false);
  });

  test('a peer copy timestamps the list as heard-from', () => {
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    expect(useSyncStatusStore.getState().bySecret[SECRET]?.lastReceivedAt ?? null).toBeNull();

    const remote = sharedList([item('a'), item('b', 5000)]);
    remote.id = 'peer-list-id';
    created[0].deliver(JSON.stringify(remote));

    expect(useSyncStatusStore.getState().bySecret[SECRET].lastReceivedAt).toBeGreaterThan(0);
  });

  test('our own publish timestamps the list as sent', () => {
    jest.useFakeTimers();
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    expect(useSyncStatusStore.getState().bySecret[SECRET]?.lastSentAt ?? null).toBeNull();

    jest.advanceTimersByTime(700);

    expect(useSyncStatusStore.getState().bySecret[SECRET].lastSentAt).toBeGreaterThan(0);
  });
});

describe('the diagnostic log a bug report carries', () => {
  // "Both phones say connected but only one ever received" is the hardest
  // shared-list report to answer, and the log is the only thing that can. These
  // pin what a real report must contain — and what it must never contain.

  test('a relay coming up and dropping is recorded, tagged so two phones line up', () => {
    useListsStore.setState({ lists: [sharedList()], hydrated: true });
    startSyncEngine();

    created[0].onStatus(1);
    created[0].onStatus(0);

    const up = logLine('sync: connected');
    const down = logLine('sync: offline');
    expect(up).toBeDefined();
    expect(down).toBeDefined();
    expect(up).toContain(`ch=${CH_TAG}`);
    expect(up).toContain('relays=1');
    expect(down).toContain(`ch=${CH_TAG}`);
    expect(down).toContain('relays=0');

    // The handle is a SHORT prefix of the (already public) channel id: enough to
    // correlate two paired devices' reports, and never the key or the whole
    // channel id, since the user mails this file to us themselves.
    const report = serializeCurrent();
    expect(CH_TAG).toHaveLength(8);
    expect(report).not.toContain(SECRET);
    expect(report).not.toContain(channelId(SECRET));
  });

  test('a frame we cannot decrypt is recorded, not silently dropped', () => {
    useListsStore.setState({ lists: [sharedList([item('rice')])], hydrated: true });
    startSyncEngine();

    // A partner on a different build, or a corrupt frame. Indistinguishable
    // from "nothing ever arrived" unless it says so.
    created[0].onMessage('!!! not even base64 !!!');

    const warned = logLine('sync: could not decrypt a message');
    expect(warned).toBeDefined();
    expect(warned).toContain('WARN');
    expect(warned).toContain(`ch=${CH_TAG}`);
  });

  test('a send no relay accepted is recorded, without the relay\'s free-text reason', () => {
    useListsStore.setState({ lists: [sharedList([item('rice')])], hydrated: true });
    startSyncEngine();

    // Every recipient rejected the publish (NIP-20 OK-false): the socket is up
    // but our change never left the device — "I ticked it and the other phone
    // never saw it", which left no trace in the report at all.
    created[0].onPublishResult!(false, 'rate-limited: slow down, npub…');

    const warned = logLine('sync: publish was not delivered');
    expect(warned).toBeDefined();
    expect(warned).toContain('WARN');
    expect(warned).toContain(`ch=${CH_TAG}`);
    expect(warned).toContain('delivered=false');

    // The reason is free text from a third-party relay — the one field in this
    // log we would not control. It never lands here.
    expect(serializeCurrent()).not.toContain('rate-limited');
    expect(serializeCurrent()).not.toContain('slow down');
    expect(serializeCurrent()).not.toContain(SECRET);
  });

  test('a delivered send is not warned about — only the failures leave a breadcrumb', () => {
    useListsStore.setState({ lists: [sharedList([item('rice')])], hydrated: true });
    startSyncEngine();

    created[0].onPublishResult!(true, '');

    expect(logLine('sync: publish was not delivered')).toBeUndefined();
  });

  test('a peer copy is recorded with how much of the list arrived', () => {
    useListsStore.setState({ lists: [sharedList([item('bread')])], hydrated: true });
    startSyncEngine();

    const remote = sharedList([item('bread'), item('butter', 5000)]);
    remote.id = 'peer-list-id';
    created[0].deliver(JSON.stringify(remote));

    const line = logLine('sync: received list state');
    expect(line).toBeDefined();
    expect(line).toContain(`ch=${CH_TAG}`);
    expect(line).toContain('items=2');
    expect(serializeCurrent()).not.toContain(SECRET);
  });
});

describe('hostile payloads on a public channel', () => {
  // The relay is open to the world and the channel id is public: anyone can
  // push anything at us. None of it may crash the app or fake a peer.

  test('a bare JSON scalar is ignored, never thrown into the app', () => {
    useListsStore.setState({ lists: [sharedList([item('rice')])], hydrated: true });
    startSyncEngine();
    const before = JSON.stringify(useListsStore.getState().lists);

    for (const payload of ['null', '42', '"just a string"', 'true']) {
      expect(() => created[0].deliver(payload)).not.toThrow();
    }

    expect(JSON.stringify(useListsStore.getState().lists)).toBe(before);
    expect(useSyncStatusStore.getState().bySecret[SECRET]?.lastReceivedAt ?? null).toBeNull();
  });

  test("a state copy carrying someone else's secret never counts as hearing from our peer", () => {
    useListsStore.setState({ lists: [sharedList([item('rice')])], hydrated: true });
    startSyncEngine();

    const foreign = sharedList([item('poison', 9000)]);
    foreign.shareIdentity = { secret: 'someone-elses-secret', createdAt: 1 };
    created[0].deliver(JSON.stringify(foreign));

    // A stranger's copy must not merge AND must not make the list read as
    // freshly synced — "last received just now" would be a lie the user acts on.
    expect(useListsStore.getState().lists[0].items.map((i) => i.id)).toEqual(['rice']);
    expect(useSyncStatusStore.getState().bySecret[SECRET]?.lastReceivedAt ?? null).toBeNull();
  });
});

describe('one channel carries exactly one list', () => {
  test('late callbacks from a replaced household cannot publish, merge, or restore status', async () => {
    useListsStore.setState({ lists: [sharedList([item('milk')])], hydrated: true });
    startSyncEngine();
    const old = created[0];
    const next = newSecret();
    await useListsStore.getState().joinShared(next);
    old.published = [];
    old.deliver(JSON.stringify({ _sync: 'hello' }));
    old.deliver(JSON.stringify(sharedList([item('late')])));
    old.onStatus(2); old.onReconnect(); old.onPublishResult?.(true, '');
    expect(old.closed).toBe(true);
    expect(old.published).toEqual([]);
    expect(useListsStore.getState().lists[0].items).toEqual([]);
    expect(useSyncStatusStore.getState().bySecret[SECRET]).toBeUndefined();
  });
});

describe('resync with nothing open', () => {
  // The resync button lives on the list screen; the engine's lifecycle is a
  // separate effect keyed on hydration. Both windows below are reachable from
  // the UI, and neither may crash the screen the button sits on.

  test('tapping resync for a secret no channel is open on does nothing and does not crash', () => {
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    created[0].published = [];

    expect(() => resyncNow(newSecret())).not.toThrow();

    expect(created[0].published).toHaveLength(0);
  });

  test('tapping resync while the engine is not running does nothing and does not crash', () => {
    // The list is on screen with its share identity, but the engine's effect
    // has not started (or its cleanup already ran), so it holds no channel.
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });

    expect(() => resyncNow(SECRET)).not.toThrow();

    expect(created).toHaveLength(0);
  });
});

describe('announce debounce', () => {
  test('once the announce window has passed, the next reconnect announces us again', () => {
    // Two sockets opening at once announce once (covered above). But a device
    // that genuinely drops and reconnects minutes later must announce again, or
    // it never pulls the state it missed.
    jest.useFakeTimers();
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    created[0].published = [];

    created[0].onReconnect();
    jest.advanceTimersByTime(3000); // the full announce window
    created[0].onReconnect();

    expect(messagesOfKind(created[0], 'hello')).toHaveLength(2);
  });
});

describe('teardown leaves nothing armed', () => {
  test('unsharing cancels the pending copy — nothing lands on the closed channel', () => {
    jest.useFakeTimers();
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    jest.advanceTimersByTime(700);
    created[0].published = [];

    // An edit is still waiting out the debounce when the user turns sharing off.
    useListsStore.setState({
      lists: [sharedList([item('a'), item('milk', 3000)])],
      hydrated: true,
    });
    useListsStore.setState({
      lists: [soloList([item('a'), item('milk', 3000)])],
      hydrated: true,
    });

    jest.advanceTimersByTime(3000);

    expect(created[0].closed).toBe(true);
    expect(created[0].published).toHaveLength(0);
  });

  test('stopping cancels every pending publish and detaches the engine', () => {
    jest.useFakeTimers();
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    startSyncEngine();
    jest.advanceTimersByTime(700);
    const transport = created[0];
    transport.published = [];

    // Arm the list debounce, then tear down.
    useListsStore.setState({
      lists: [sharedList([item('a'), item('milk', 3000)])],
      hydrated: true,
    });
    expect(jest.getTimerCount()).toBeGreaterThan(0);

    stopSyncEngine();

    // Nothing may fire after teardown — a stranded timer publishes onto a closed
    // relay socket, and a stranded subscription re-arms one on the next edit.
    expect(jest.getTimerCount()).toBe(0);
    jest.advanceTimersByTime(5000);
    expect(transport.published).toHaveLength(0);
    useListsStore.setState({ lists: [sharedList([item('a')])], hydrated: true });
    expect(jest.getTimerCount()).toBe(0);
    expect(transport.published).toHaveLength(0);
  });
});

describe('the transport seam', () => {
  test('restoring puts the PREVIOUS factory back, so a fake cannot leak forward', () => {
    const inner: string[] = [];
    const restoreInner = __setTransportFactory((channel, onMessage, onReconnect, onStatus) => {
      inner.push(channel);
      return new FakeTransport(channel, onMessage, onReconnect, onStatus);
    });

    restoreInner();

    useListsStore.setState({ lists: [sharedList()], hydrated: true });
    startSyncEngine();

    // Without a working restore the inner fake would still be installed here —
    // and in production the surrounding factory is the REAL relay transport.
    expect(inner).toHaveLength(0);
    expect(created).toHaveLength(1);
  });
});

describe('single-list sharing lifecycle', () => {
  test('joining stays read-only and never publishes a placeholder, including hello/reconnect/background', async () => {
    useListsStore.setState({ lists: [soloList([item('private')])], hydrated: true });
    startSyncEngine();
    await useListsStore.getState().joinShared(SECRET);
    const joining = created[0];
    const id = useListsStore.getState().lists[0].id;
    useListsStore.getState().addItem(id, 'Must not appear');
    joining.onReconnect(); joining.deliver(JSON.stringify({ _sync: 'hello' })); flushSyncEngine();
    expect(useListsStore.getState().lists[0].items).toEqual([]);
    expect(joining.decoded().every(m => m._sync === 'hello')).toBe(true);
    const remote = { ...sharedList([item('remote')]), categoryOrder: ['Custom','Other'] };
    joining.deliver(JSON.stringify(remote));
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(useListsStore.getState().pendingJoin).toBe(false);
    expect(useListsStore.getState().lists[0]).toMatchObject({ id, items: remote.items, categoryOrder: remote.categoryOrder });
    expect(useSyncStatusStore.getState().bySecret[SECRET].lastReceivedAt).not.toBeNull();
    flushSyncEngine();
    expect(created.at(-1)!.decoded().find(m => m.items)?.categoryOrder).toEqual(['Custom','Other']);
  });

  test('invalid and legacy control messages do not unlock a pending join or claim successful sync', async () => {
    useListsStore.setState({ lists: [soloList()], hydrated: true });
    startSyncEngine();
    await useListsStore.getState().joinShared(SECRET);
    const pending = created[0];
    for(const data of [ { ...sharedList(), items: 'bad' }, { ...sharedList(), _sync:'kits' }, { ...sharedList(), updatedAt: null } ])
      pending.deliver(JSON.stringify(data));
    expect(useListsStore.getState().pendingJoin).toBe(true);
    expect(useSyncStatusStore.getState().bySecret[SECRET]?.lastReceivedAt).toBeUndefined();
  });

  test('stop keeps a private copy, clears the channel, and starting again creates a different secret', async () => {
    const original = { ...sharedList([item('milk')]), categoryOrder:['Custom','Other'], aislePreferences:[{id:'name:milk',category:'Custom',updatedAt:1000}] };
    useListsStore.setState({ lists:[original], hydrated:true }); startSyncEngine();
    const old = created[0];
    await useListsStore.getState().stopSharing();
    const privateList = useListsStore.getState().lists[0];
    expect(privateList.items).toEqual(original.items);
    expect(privateList.categoryOrder).toEqual(original.categoryOrder);
    expect(privateList.aislePreferences).toEqual(original.aislePreferences);
    expect(privateList.shareIdentity).toBeUndefined(); expect(privateList.id).not.toBe(original.id);
    expect(old.closed).toBe(true);
    const secret = await useListsStore.getState().shareList(privateList.id);
    expect(secret).not.toBe(SECRET);
    old.deliver(JSON.stringify(sharedList([item('late')])));
    expect(useListsStore.getState().lists[0].items).toEqual(original.items);
  });

  test('failed replacement retains the former list and reopens its channel', async () => {
    const db = require('../../store/db');
    useListsStore.setState({ lists:[sharedList([item('keep')])], hydrated:true }); startSyncEngine();
    db.replaceCurrentList.mockRejectedValueOnce(new Error('disk full'));
    await expect(useListsStore.getState().joinShared(newSecret())).rejects.toThrow('disk full');
    expect(useListsStore.getState().transitioning).toBe(false);
    expect(useListsStore.getState().lists[0].items[0].name).toBe('keep');
    expect(created.at(-1)?.closed).toBe(false);
  });
});
