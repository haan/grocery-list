/**
 * The share link IS the pairing handshake — parse failures must degrade to
 * null, never throw into the deep-link
 * handler, and never accept an implausible secret (a truncated link would
 * silently pair onto a dead channel).
 */

let buildShareLink: typeof import('../share').buildShareLink;
let parseShareLink: typeof import('../share').parseShareLink;
let SHARE_SCHEME: string;

describe.each(['development', 'production'])('%s invitations', variant => {
  beforeAll(() => {
    jest.doMock('expo-application', () => ({
      applicationId: variant === 'production' ? 'io.github.haan.grocerylist' : 'io.github.haan.grocerylist.dev',
    }));
    jest.isolateModules(() => {
      ({ buildShareLink, parseShareLink } = require('../share'));
      ({ SHARE_SCHEME } = require('../shareConfig'));
    });
  });
  afterAll(() => jest.dontMock('expo-application'));

  const SECRET = 'A'.repeat(43) + '='; // base64 of 32 bytes

  describe('buildShareLink', () => {
    it('builds the app-scheme join URL with the secret URI-encoded', () => {
      const link = buildShareLink('a+b/c=');
      expect(link).toBe(`${SHARE_SCHEME}://join?s=${encodeURIComponent('a+b/c=')}`);
    });

    it('round-trips: what one phone builds, the other parses back verbatim', () => {
      expect(parseShareLink(buildShareLink(SECRET))).toBe(SECRET);
      // Secrets with URL-hostile characters survive the trip too.
      const hostile = '/+'.repeat(21) + 'A=';
      expect(parseShareLink(buildShareLink(hostile))).toBe(hostile);
    });
  });

  describe('parseShareLink', () => {
    it('returns null for a missing url (deep-link APIs deliver null on cold start)', () => {
      expect(parseShareLink(null as unknown as string)).toBeNull();
      expect(parseShareLink(undefined as unknown as string)).toBeNull();
      expect(parseShareLink('')).toBeNull();
    });

    it('returns null for a URL with no secret param — never throws', () => {
      expect(parseShareLink('https://example.com/whatever')).toBeNull();
      expect(parseShareLink(`${SHARE_SCHEME}://join`)).toBeNull();
    });

    it('accepts the secret as first or later param in this variant', () => {
      expect(parseShareLink(`${SHARE_SCHEME}://join?s=${SECRET}`)).toBe(SECRET);
      expect(parseShareLink(`${SHARE_SCHEME}://join?utm=x&s=${SECRET}`)).toBe(SECRET);
    });

    it('rejects an implausibly short secret (a truncated link must not pair)', () => {
      expect(parseShareLink(`${SHARE_SCHEME}://join?s=short`)).toBeNull();
      expect(parseShareLink(`${SHARE_SCHEME}://join?s=fifteen-chars15`)).toBeNull();
    });

    it('rejects a truncated 16-character secret', () => {
      const sixteen = 'abcdefghij123456';
      expect(sixteen).toHaveLength(16);
      expect(parseShareLink(`${SHARE_SCHEME}://join?s=${sixteen}`)).toBeNull();
    });

    it('returns null (not a crash) on malformed percent-encoding', () => {
      expect(parseShareLink(`${SHARE_SCHEME}://join?s=%E0%A4%A`)).toBeNull();
    });
  });

  it('rejects other variants and arbitrary URLs without joining', () => {
    const other = variant === 'production' ? 'haan-grocerylist-dev' : 'haan-grocerylist';
    expect(parseShareLink(other + '://join?s=' + SECRET)).toBeNull();
    expect(parseShareLink('https://example.com/join?s=' + SECRET)).toBeNull();
    expect(parseShareLink('?s=' + SECRET)).toBeNull();
    expect(parseShareLink(SHARE_SCHEME + '://other?s=' + SECRET)).toBeNull();
    expect(parseShareLink(SHARE_SCHEME + '://join.evil?s=' + SECRET)).toBeNull();
  });
});
