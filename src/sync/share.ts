import { newSecret } from './crypto';
import { SHARE_SCHEME } from './shareConfig';

/** The persistent shared-list identity. Stored on every paired device once
 *  minted. The channel id and the symmetric key both derive from `secret`. */
export interface ShareIdentity {
  secret: string;
  createdAt: number;
}

export function isShareSecret(secret: string): boolean {
  return /^[A-Za-z0-9+/]{43}=$/.test(secret);
}

export function makeShareIdentity(): ShareIdentity {
  return { secret: newSecret(), createdAt: Date.now() };
}

/** Deep link encoding the secret. Tapping it (or scanning the QR of the same
 *  string) is all the other person does. */
export function buildShareLink(secret: string): string {
  return `${SHARE_SCHEME}://join?s=${encodeURIComponent(secret)}`;
}

/** Accept only this installed variant's invitations. In particular, scanning a
 *  household QR in Dev must not connect experimental code to the household list. */
export function parseShareLink(url: string): string | null {
  if (!url || !url.startsWith(`${SHARE_SCHEME}://join?`)) return null;
  const m = url.match(/[?&]s=([^&#]+)/);
  if (!m) return null;
  try {
    const secret = decodeURIComponent(m[1]);
    // base64 of 32 bytes ≈ 44 chars; sanity-check it's plausible.
    return isShareSecret(secret) ? secret : null;
  } catch {
    return null;
  }
}
