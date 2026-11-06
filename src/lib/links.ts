import { Linking } from 'react-native';
import * as Application from 'expo-application';

export const APP_NAME = 'Grocery List Dev';

export const REPO_URL = 'https://github.com/haan/grocery-list';
export const PROJECT_URL = REPO_URL;
export const PRIVACY_URL =
  'https://github.com/haan/grocery-list/blob/main/PRIVACY.md';

/** `1.2.0 (47)` — read from the bundle at runtime, never hardcoded. */
export function versionLabel(): string {
  const v = Application.nativeApplicationVersion ?? '1.0.0';
  const b = Application.nativeBuildVersion ?? '1';
  return `${v} (${b})`;
}

export function openUrl(url: string): void {
  Linking.openURL(url).catch(() => {});
}

export function openFeedback(): void {
  // Open an empty issue form; never attach logs or list contents automatically.
  openUrl(`${REPO_URL}/issues/new`);
}
