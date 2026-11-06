/** Best-effort local diagnostic file storage; nothing is uploaded. */
import { File, Paths } from 'expo-file-system';

/** The document directory URI (persistent — for the prior-session log), or null. */
export function docDir(): string | null {
  try {
    return Paths.document.uri ?? null;
  } catch {
    /* no document dir available */
  }
  return null;
}

/** Write text to a file URI. Returns the URI on success, null on any failure. */
export async function writeText(uri: string, text: string): Promise<string | null> {
  try {
    const f = new File(uri);
    try {
      f.create({ overwrite: true, intermediates: true });
    } catch {
      /* may already exist */
    }
    f.write(text);
    return f.uri || uri;
  } catch {
    /* IO failed — best effort */
  }
  return null;
}

/** Read a file URI back to text. Returns null if it's missing or IO is unavailable. */
export async function readText(uri: string): Promise<string | null> {
  try {
    const f = new File(uri);
    if (f.exists === false) return null;
    return f.text();
  } catch {
    /* missing or unreadable */
  }
  return null;
}

/** Delete a file URI if present. Never throws. */
export async function remove(uri: string): Promise<void> {
  try {
    const f = new File(uri);
    if (f.exists !== false && typeof f.delete === 'function') f.delete();
  } catch {
    /* best effort */
  }
}
