# Architecture

Grocery List is an Android-only Expo SDK 57 / React Native app. Zustand stores
hold the working state, SQLite persists it, and encrypted snapshots over public
Nostr relays synchronize a shared list. Shopping works offline; there is no
application server or user account.

Use this document for the current design and invariants. See
[README.md](README.md) for setup, [docs/development.md](docs/development.md) for
device and release procedures, and the [repository audit](docs/repository-audit.md)
for historical removals.

## Code map

| Area | Responsibility |
| --- | --- |
| [App.tsx](App.tsx) | Store hydration, stack navigation, share links, sync lifecycle, background flushes. |
| [src/shell](src/shell) | Safe areas, gestures, navigation theme, language preference, diagnostics, splash visibility. |
| [src/screens](src/screens), [src/components](src/components) | Shopping list, item picker/editor, sharing, settings, and aisle management. |
| [src/data](src/data) | Domain types, item drafts, catalog matching, aisle order, and learned preferences. |
| [src/store](src/store) | Zustand list/history stores, schema initialization, and queued SQLite writes. |
| [src/storage](src/storage) | Shared SQLite connection and database filename. |
| [src/sync](src/sync) | Logical clock, snapshot validation, merge rules, encryption, relay transport, and delivery status. |
| [src/theme](src/theme), [src/i18n](src/i18n) | Appearance, fonts, interface strings, and locale selection. |
| [src/feedback](src/feedback) | Bounded local diagnostics; no reporting UI or upload. |
| [src/qa](src/qa), [qa](qa) | Layout checks, fixtures, model-based tests, and regression replay. |
| [scripts/lod](scripts/lod), [scripts/language](scripts/language) | Catalog generation and developer-only language review. |
| [app.config.js](app.config.js), [eas.json](eas.json), [plugins](plugins) | App variants, cloud build profiles, and native configuration. |

## Startup and navigation

`App.tsx` hydrates the list store and then the local history/account store before
starting synchronization. Despite its name, `useAccountStore` does not represent
a signed-in user. Startup never seeds demo shopping data.

The native Android launch screen stays visible until fonts and stores are ready
and content has laid out. Initialization failure shows a Retry screen. `AppShell`
owns navigation context, appearance/language preferences, and local diagnostics;
there is no extra animated splash.

The initial `Lists` route renders `ListsHomeScreen` directly. Other stack routes
are `Share`, `Settings`, and `ReorderAisles`; there is no list overview or tab bar.
Add items opens the catalog/Recent browser. Settings includes update controls,
version information, and a fixed Luxembourgish dedication.

Cold-start share links wait for store hydration and navigation readiness before
opening confirmation. Opening Sharing alone never starts sharing. On backgrounding,
the app flushes pending local writes and sync publication on a best-effort basis.

## Local state and persistence

`src/storage/kv.ts` memoizes one SQLite connection to `grocery-list.db`.
`src/store/db.ts` initializes the schema before returning it to store operations.
The hydrated list store contains exactly one list; its array is an internal
container. Recent history, appearance, and language preferences stay local.

Ordinary edits update memory immediately and queue SQLite saves. Saves update
only the current local ID, so an old queued write cannot resurrect a replaced
list. Sharing identity changes use an atomic database replacement before the
store exposes the result. Preserve these boundaries when adding mutations.

`src/data/itemDraft.ts` applies confirmed item details to the latest list state.
Cancel discards the draft. A save commits item changes and explicit aisle learning
together, preserving untouched fields and the separate checked-state clock.
Only additions/re-additions record Recent usage. Replacing the list closes its
drafts.

Recent names use the same trimmed, NFC-normalized, lowercase identity in memory
and SQLite. Queued history transactions consolidate duplicate rows, preserve
total use counts/latest use time, and make renames atomic. Renaming or forgetting
a Recent suggestion does not edit existing shopping items.

## Sharing lifecycle

`src/store/lists.ts` owns identity transitions; `src/sync/index.ts` reacts to
them and manages transports.

1. **Private:** edits persist locally. Start sharing creates and persists a secret
   before exposing an invitation.
2. **Joining:** confirmation replaces the local list with a persisted pending
   identity. The phone requests a snapshot with `hello`, but cannot edit or
   publish a list snapshot.
3. **Shared:** the first valid snapshot is adopted durably while retaining this
   phone's local ID. Only then does ordinary merging/publication begin.
4. **Stop sharing:** an atomic replacement creates a new private local ID and
   keeps items, aisles, and learned rules. Other participants keep their copies.
   Starting sharing again creates a fresh secret.

Pending state is local metadata and never goes on the wire. Identity transitions
close transports and cancel timers before awaiting disk writes. Callback guards
reject activity from obsolete channels. These guards prevent late traffic from
modifying a replacement list.

Invitations contain the list secret. `src/sync/shareConfig.ts` selects the scheme
from the installed binary's application ID, so Dev and everyday invitations are
separate. This is an invitation safeguard, not a separate relay service.

## Synchronization and compatibility

The engine validates decrypted snapshots before adopting or merging them.
Catch-up requests and retained relay deposits support phones that were not online
together; relay availability and retention remain best-effort. Unsupported
control messages do not update list data or sync status.

`merge.ts` and `mergeRecordSet.ts` resolve individual records using logical
timestamps and deterministic tie-breaking. Deletions are tombstones. Duplicate
normalized item names converge to one visible item. Incoming timestamps advance
the local clock; future-skew healing occurs at the store boundary.

Keep the following clocks and fallbacks compatible between installed versions:

| State | Conflict rule |
| --- | --- |
| List name | `nameUpdatedAt`, falling back to `createdAt` when absent. |
| Item contents/deletion | Per-record timestamps and tombstones. |
| Checked state | Newest of `checkedUpdatedAt` and `checkedAt`, falling back to `addedAt`; content edits must not override it. |
| Aisle membership/order | `categoryOrderUpdatedAt`, falling back to list `updatedAt` when absent. |
| Learned aisle preferences | Per-preference clocks and tombstones. |

Only aisle creation, rename, deletion, or reorder advances an established
`categoryOrderUpdatedAt`. This separate clock protects aisle changes from
unrelated offline item edits.

Delivery status follows the latest stored list publication. A `hello` response
or late acknowledgement of a superseded upload cannot clear a failed upload.
Changes to validation, clocks, encryption, payload shape, or relay slots need
compatibility review and convergence tests.

## Catalog and language

The checked-in catalog works offline. The reviewed source is
`scripts/lod/manifest.json`; generation produces `src/data/seedCatalogData.ts`.
Product IDs remain stable because shared learned rules reference them. Explicit
aisle corrections affect future additions in that list and synchronize with it.
Removing a custom aisle reclassifies affected items and tombstones its rules.
See the [catalog guide](scripts/lod/README.md) for matching and regeneration.

Product and built-in aisle labels stay Luxembourgish. Interface choices are
System, English, and Lëtzebuergesch. System selects the first supported language
in Android's ordered preferences, falling back to English; an explicit local
choice wins. Effective-language changes on foreground refresh navigation.
Formatting follows that language; user content is never translated. Android
declares only `en` and `lb`. See [language review](scripts/language/README.md)
for translation conventions.

## App variants, builds, and updates

`app.config.js` overlays `app.json`; local development defaults to Dev, while EAS
profiles select `APP_VARIANT` explicitly.

| | Development | Everyday |
| --- | --- | --- |
| Android package | `io.github.haan.grocerylist.dev` | `io.github.haan.grocerylist` |
| Invitation scheme | `haan-grocerylist-dev` | `haan-grocerylist` |
| EAS profile/channel | `development` | `production` |
| Runtime workflow | Metro and Fast Refresh | Standalone APK and compatible Expo Updates |

Storage is separate per package. EAS generates the native Android project from
configuration/plugins; generated native folders are ignored. Preserve package
identity and signing credentials for APK updates. Native changes require a new
APK; JavaScript/assets can use the fingerprint-compatible update channel.

Production checks/downloads compatible updates at startup. Settings → Updates
also supports checking and an explicit restart. `UpdateSetting.tsx` saves the
list before restarting and blocks restart during a pending join, identity
transition, or failed write. Dev uses Metro and disables these update APIs.
`scripts/update-production.cjs` verifies the target production APK and matching
native fingerprint before publication. See the
[release procedure](docs/development.md#expo-updates-for-the-everyday-app).

## Verification

The [Checks workflow](.github/workflows/checks.yml) runs `npm ci`, the Android
configuration guard, fuzz-harness self-tests, TypeScript, and Jest's Android
preset. It runs on main pushes, pull requests, and manual dispatch; it does not
publish releases or run scheduled builds/emulators.

Tests cover persistence, merge convergence, privacy, accessibility, and UI
behavior/layout. Test-only fixtures/helpers stay out of production imports.
Transient fuzz logs go to ignored `tmp/`; reviewed minimized fixtures belong in
`qa/regressions`. See [model testing](qa/intent-fuzz/README.md) for replay and
the [development guide](docs/development.md) for physical-device acceptance,
which is separate from automated checks.
