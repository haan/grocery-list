/** Bounded local diagnostics: privacy scrubbing and readable error traces. */
jest.mock('../fileStore', () => ({
  cacheDir: jest.fn(() => 'file:///cache/'),
  docDir: jest.fn(() => 'file:///docs/'),
  writeText: jest.fn(async (uri: string) => uri),
  readText: jest.fn(async () => null),
  remove: jest.fn(async () => {}),
}));

import { logEvent, logError, logWarn, serialize, serializeBounded, entryCount, clear } from '../log';

beforeEach(() => { clear(); jest.clearAllMocks(); });

describe('diagnostic log — privacy scrub', () => {
  it('never lets full field content into the serialized log', () => {
    const secret = 'SENSITIVE-CONTENT-'.repeat(40); // ~720 chars of "user content"
    logEvent('test', 'did a thing', { note: secret, payload: { a: 1, b: 2 } });
    const out = serialize();

    // The structured message is kept…
    expect(out).toContain('did a thing');
    // …but the long field value is clipped (never present in full)…
    expect(out).not.toContain(secret);
    expect(out).toMatch(/…\(\+\d+\)/); // the truncation marker
    // …and a nested object collapses to a type tag, not its contents.
    expect(out).toContain('payload=[object]');
    expect(out).not.toContain('"a":1');
  });

  it('caps the ring buffer so it cannot grow unbounded', () => {
    for (let i = 0; i < 900; i++) logEvent('loop', `event-${i}`);
    expect(entryCount()).toBeLessThanOrEqual(600);
    const out = serialize();
    expect(out).toContain('event-899'); // newest kept
    expect(out).not.toContain('event-0 '); // oldest dropped (trailing space avoids event-0xx)
  });
});

describe('diagnostic log — is it actually readable', () => {
  it('stamps every line with local time of day, not just seconds since boot', () => {
    logEvent('test', 'a thing happened');
    // "13:09:18 INFO  test: a thing happened"
    expect(serialize()).toMatch(/^\d{2}:\d{2}:\d{2} INFO\s+test: a thing happened$/m);
  });

  it('opens with a counted summary so triage starts at the answer', () => {
    logEvent('test', 'fine');
    logWarn('test', 'hmm');
    logError('test', new Error('boom'));
    const head = serialize().split('\n\n')[0];
    expect(head).toMatch(/^Session:/m);
    expect(head).toContain('1 error(s)');
    expect(head).toContain('1 warning(s)');
  });

  it('collapses a repeated message instead of letting it flood the buffer', () => {
    // The real report that triggered this: one Expo deprecation warning, three
    // times, and nothing else — the noise had pushed everything useful out.
    for (let i = 0; i < 40; i++) logWarn('console', 'Method writeAsStringAsync is deprecated.');
    logEvent('nav', 'Settings');
    expect(entryCount()).toBe(2); // the collapsed run + the nav breadcrumb
    expect(serialize()).toContain('(×40)');
  });

  it('suppresses a chronic non-consecutive repeat rather than burying the trail', () => {
    for (let i = 0; i < 30; i++) {
      logWarn('console', 'the same warning again');
      logEvent('nav', `Screen-${i}`); // breaks the consecutive run every time
    }
    const lines = serialize().split('\n').filter((l) => l.includes('the same warning again'));
    expect(lines.length).toBeLessThanOrEqual(8);
    expect(serialize()).toContain('further repeats suppressed');
    // The breadcrumbs it would otherwise have crowded out are all still there.
    expect(serialize()).toContain('Screen-29');
  });

  it('trims from the FRONT when it has to fit, keeping the header and the newest lines', () => {
    for (let i = 0; i < 400; i++) logEvent('loop', `event-${i}`);
    const kept = serializeBounded(2000);
    expect(kept.length).toBeLessThanOrEqual(2000);
    expect(kept).toContain('Recorded:'); // the counted header survives the trim
    expect(kept).toContain('event-399'); // and the newest events, not the oldest
    expect(kept).not.toContain('event-1 ');
  });

  it('keeps a stack trace at full length — a trace clipped to one frame is useless', () => {
    const err = new Error('boom');
    err.stack = `Error: boom\n${'    at someDeeplyNestedFrame (app.bundle:12345:67)\n'.repeat(30)}`;
    logError('test', err);
    const out = serialize();
    expect(out).toContain('someDeeplyNestedFrame');
    expect(out.length).toBeGreaterThan(1000); // not clipped to the 120-char field cap
  });
});
