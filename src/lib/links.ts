/**
 * Canonical external links + the version string. One place so the Settings
 * row and the review modal stay identical (canon § Settings / About).
 */

import { Linking, Platform } from 'react-native';
import * as Application from 'expo-application';

export const APP_NAME = 'Grocery List Dev';

/** No store listing exists for this independent development app. */
export const IOS_APP_STORE_ID = '';
export const ANDROID_PACKAGE = 'io.github.haan.grocerylist.dev';

/**
 * Gates the IAP tip jar — the sanctioned support surface (App Store
 * guideline 3.1.1 requires In-App Purchase for this kind of support link).
 * Powers the home support link and the Settings/About support row, each
 * opening the canonical TipJarSheet.
 */
export const TIP_JAR_ENABLED: boolean = false;
export const STORE_REVIEWS_ENABLED: boolean = false;
// No feedback inbox is configured for the independent app. The UI opens GitHub.
export const FEEDBACK_EMAIL = '';

export const REPO_URL = 'https://github.com/haan/grocery-list';
export const STUDIO_URL = REPO_URL;
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

export function openFeedbackMail(): void {
  // Open an empty issue form; never attach logs or list contents automatically.
  openUrl(`${REPO_URL}/issues/new`);
}

export function openReview(): void {
  if (!STORE_REVIEWS_ENABLED) return;
  const url =
    Platform.OS === 'ios'
      ? `itms-apps://apps.apple.com/app/id${IOS_APP_STORE_ID}?action=write-review`
      : `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
  openUrl(url);
}
