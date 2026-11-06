import * as Application from 'expo-application';

/** `1.2.0 (47)` — read from the bundle at runtime, never hardcoded. */
export function versionLabel(): string {
  const v = Application.nativeApplicationVersion ?? '1.0.0';
  const b = Application.nativeBuildVersion ?? '1';
  return `${v} (${b})`;
}
