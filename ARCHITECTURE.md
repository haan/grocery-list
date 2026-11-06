# Architecture

An Android-only Expo SDK 57 app, maintained independently in haan/grocery-list.
SQLite stores lists and kits locally; encrypted Nostr messages synchronize shared
data without an application server or user account. Node 26.12.1 is required.
See [development](docs/development.md) and [repository audit](docs/repository-audit.md).

## Startup and UI

App.tsx hydrates list, kit, and account stores before showing navigation, starts
synchronization, handles share links, and flushes pending writes on backgrounding.
It never seeds demo data. The app shell owns safe areas, gestures, navigation theme,
language preference, local diagnostics, and splash. The main tabs are Lists and Kits.

The package is io.github.haan.grocerylist.dev; links use haan-grocerylist-dev.
Settings and the list footer open the GitHub issue form without attaching logs.
There are no purchase, store-review, launch-promotion, email-report, or other-app
promotion flows. All first-party files are independently maintained here; no
external template synchronization is active. Preserve licenses and attribution.

## Code ownership

| Area | Purpose |
| --- | --- |
| src/data | Domain types, catalog matching, aisle preferences, credits. |
| src/store | Zustand state and SQLite persistence. |
| src/sync | Logical clock, encryption, relay transport, list/kit merges. |
| src/screens, src/components, src/shell | Android UI and application shell. |
| src/theme, src/i18n | Fonts, styling, interface translations. |
| src/feedback | Bounded local diagnostics and GitHub feedback action. |
| src/qa | Test-only layout helpers and checks. |
| qa/intent-fuzz | Active model-based testing, seed logging, replay. |
| scripts/lod | Reviewed LOD source references and deterministic generation. |

## Persistence and sharing invariants

Store actions update memory synchronously and queue SQLite writes. flushPending()
waits for writes before background suspension. Hydration repairs legacy data
without resetting the database. Account/history state remains local. Export/import
and duplication preserve independent aisle preferences.

Shared lists use encrypted snapshots over public relays. Catch-up requests and
retained relay deposits support phones that were not online together. Availability
and retention are best-effort. Merge functions resolve records individually with
logical timestamps and deterministic tie-breaking. Deletions are tombstones.
Name, checked-state, items, kits, and preferences retain their clock/validation
semantics. Check compatibility with installed fork versions before changing them.

Product and built-in aisle labels are Luxembourgish; menus follow the selected
interface language. The bundled catalog works offline. Manual aisle corrections
apply to future additions in that list and synchronize with it. Removing a custom
aisle reclassifies affected items and tombstones its preferences. See the
[catalog guide](scripts/lod/README.md) for matching and learning rules.

## Checks and builds

The single GitHub workflow runs locked installation, the Android configuration
guard, fuzz-harness self-tests, TypeScript, and Jest's Android preset. Retained
tests cover domain behavior, migrations, synchronization, privacy, accessibility,
and UI interactions/layout. Fuzz logs/intake go to ignored tmp/; minimized
regression JSON remains tracked under qa/regressions. Fixtures/helpers used only
by tests are not imported by production code.

EAS generates the Android native project from configuration and plugins. Preserve
package identity and signing key when updating the Pixel. Native changes require
a new APK; JavaScript edits use Metro. No web target, store submission, emulator
CI, or scheduled build is configured. Third-party framework tooling is unmodified.
