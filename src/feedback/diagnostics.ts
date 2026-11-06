import { Platform } from 'react-native';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { getLocale } from '../i18n';

export type Diagnostics = {
  app: string;
  version: string; // "1.2.0 (47)"
  platform: 'Android';
  osVersion: string;
  device: string;
  locale: string;
  when: string; // ISO timestamp
};

/** The app's display name (from the native bundle) without the " - Josh Approved"
 *  identity suffix, for a tidy subject line. */
export function shortAppName(): string {
  const raw = (Application.applicationName || '').trim();
  return raw.replace(/\s*-\s*Josh Approved\s*$/i, '').trim() || raw || 'App';
}

/** "1.2.0 (47)" read from the native bundle; "unknown" if unavailable. */
function appVersion(): string {
  const v = Application.nativeApplicationVersion || '';
  const b = Application.nativeBuildVersion || '';
  if (!v) return 'unknown';
  return b ? `${v} (${b})` : v;
}

/** Device model via expo-device; a neutral placeholder if it can't be read. */
function deviceModel(): string {
  const name = Device.modelName || Device.deviceName;
  return name ? String(name) : 'unknown device';
}

export function collectDiagnostics(): Diagnostics {
  const platform = 'Android';
  return {
    app: shortAppName(),
    version: appVersion(),
    platform,
    osVersion: String(Platform.Version),
    device: deviceModel(),
    locale: getLocale(),
    when: new Date().toISOString(),
  };
}
