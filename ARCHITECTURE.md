# Architecture

An Android-only Expo SDK 57 app, maintained independently in haan/grocery-list.
SQLite stores one list locally; encrypted Nostr messages synchronize shared
data without an application server or user account. Node 26.12.1 is required.
See [development](docs/development.md) and [repository audit](docs/repository-audit.md).

## Startup and UI

App.tsx hydrates list and account stores before showing navigation, starts
synchronization, handles share links, and flushes pending writes on backgrounding.
It never seeds demo data. The app shell owns safe areas, gestures, navigation theme,
language preference, local diagnostics, and splash. Lists is the initial stack route;
there is no overview or bottom-tab navigator. ListsHomeScreen renders the items directly.
Add items opens the item picker directly; the bottom sharing indicator opens Sharing.

The package is io.github.haan.grocerylist.dev; links use haan-grocerylist-dev.
Settings offers appearance, language, sharing, Manage aisles, and a standalone version line.
The feedback/About UI and decorative footers have been removed. Local diagnostics
are initialized by the app shell, independently of any reporting UI.
There are no purchase, store-review, launch-promotion, email-report, or other-app
promotion flows. All first-party files are independently maintained here; no
external template synchronization is active. Preserve licenses and attribution.

## Code ownership

| Area | Purpose |
| --- | --- |
| src/data | Domain types, catalog matching, aisle preferences. |
| src/store | Zustand state and SQLite persistence. |
| src/sync | Logical clock, encryption, relay transport, list merges. |
| src/screens, src/components, src/shell | Android UI and application shell. |
| src/theme, src/i18n | Fonts, styling, interface translations. |
| src/feedback | Bounded local diagnostics; no feedback UI or upload. |
| src/qa | Test-only layout helpers and checks. |
| qa/intent-fuzz | Active model-based testing, seed logging, replay. |
| scripts/lod | Reviewed LOD source references and deterministic generation. |

## Persistence and sharing invariants

Database initialization runs the atomic single-list-v1 migration before either
store hydrates or sync starts. It clears shopping tables and the old favorites
setting, inserts one empty private list, and writes its marker in one transaction.
Failures roll back and show Retry; subsequent launches preserve the list/history.
Appearance, language, and bounded local diagnostics are retained.

Ordinary item edits update memory immediately and queue SQLite saves. Saves only
update the current local ID, so stale writes cannot resurrect a replaced list.
Sharing identity changes await an atomic replacement before exposing their result.
The store has exactly one list after hydration (the array remains an internal
container). Public create/rename/duplicate/delete/import/bulk-sync APIs are gone.

Join confirmation replaces the list with a persisted pending identity. Pending
joins send hello requests but cannot edit or publish snapshots. The first valid
snapshot is adopted durably, retaining this phone's local ID; then normal merging
begins. Pending state is local metadata, never sent on the wire. Identity changes
close transports and cancel timers before disk awaits. Callback guards reject old
channels. Stop sharing makes a fresh private local ID and retains items, aisles,
and learned rules; starting again mints a fresh secret. Recent history stays local.
Cold-start links queue until initialization and navigation are ready, then open
confirmation. Opening Sharing alone has no sharing side effects.

Shared lists use encrypted snapshots over public relays. Catch-up requests and
retained relay deposits support phones that were not online together. Availability
and retention are best-effort. Merge functions resolve records individually with
logical timestamps and deterministic tie-breaking. Deletions are tombstones.
Name, checked-state, items, and preferences retain their clock/validation
semantics. Check compatibility with installed fork versions before changing them.

Product and built-in aisle labels are Luxembourgish; menus follow the selected
interface language (currently English). The picker retains System and English;
future translation dictionaries register in src/i18n/locales.ts. Retired saved
language preferences migrate to System. The bundled catalog works offline. Manual aisle corrections
apply to future additions in that list and synchronize with it. Removing a custom
aisle reclassifies affected items and tombstones its preferences. See the
[catalog guide](scripts/lod/README.md) for matching and learning rules.

Kit storage is retired with an idempotent DROP TABLE IF EXISTS kits on database
initialization. The one-time single-list migration supersedes the earlier kit-only
upgrade; it deliberately resets all old shopping data.
Unsupported control messages, including legacy kit messages, are ignored without
updating list data or sync status. Existing list wire format and relay slots remain
unchanged; no deletion is broadcast to older installations or relay storage.

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
