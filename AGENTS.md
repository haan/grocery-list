# Grocery List development

This is an independent Android app maintained in haan/grocery-list. Preserve the
upstream MIT copyright and license. Files inherited from the upstream app shell
can be edited here; no external template synchronization is active.

The app uses Expo SDK 57. Read https://docs.expo.dev/versions/v57.0.0/ when changing
Expo integration code; check package.json before applying advice for another SDK.

Use Node 26.12.1 (see .nvmrc), npm ci, and npm run dev. See docs/development.md for
the physical-device workflow. No emulator or local Android SDK is required when
using EAS cloud builds. Use the existing project, never create-expo-app.

Run npm run check:android, npm run test:fuzz-harness, npm run typecheck, and
npm test -- --runInBand for relevant code changes. Keep the app Android-only.
See docs/repository-audit.md for retained tooling and removed legacy features.
Never put signing keys or access tokens in source control. Keep test sharing
separate from household lists. Nostr merge semantics must remain compatible
between installed versions of this fork.
