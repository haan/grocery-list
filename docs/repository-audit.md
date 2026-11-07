# Android-only repository audit

Baseline: main commit 5edb48bd2bff1fd78e0700898604846c2b39aa8d. Work branch:
cleanup/android-only. Audit date: 2026-11-06. No history rewrite or main merge.

## Item swipe action layout (current phase)

Branch `fix/swipe-delete-layout`: the retained left-swipe gesture opens a Delete
action, but its column layout and `alignSelf: stretch` placed the fixed-width
button under the shifted content rather than in the revealed right-hand area.
`src/components/SwipeRow.tsx` now uses a horizontal action layer aligned right,
stretching the button vertically, and clips sliding content to the row bounds.
Gesture thresholds, deletion and Undo behaviour are unchanged. The user confirmed
on the Pixel that swiping left reveals Delete, swiping right closes it, and Delete
followed by Undo restores the item.
TypeScript, Android configuration checks and all 530 tests in 52 suites passed.
Device verification used the development app through Metro.

## Custom suggestion editing

Branch `fix/catalog-suggestion-editing`: separate Recent membership from whether
a suggestion can be edited. Catalog names and confirmed aliases never show the
pencil, including after they enter history. Custom full names keep editing,
forgetting and Undo. Item editing, history recording, matching and classification
are unchanged. The catalog-name lookup is prepared once with the browser index.

Changed `src/data/suggestionBrowser.ts`, `src/components/ItemPicker.tsx`, their
existing regression tests, and the development guide. Regression coverage checks
catalog plurals/aliases, case/accents/Unicode/whitespace normalization, custom
longer names, history updates and the retained custom editing form.
Validation: TypeScript, all 530 tests in 52 suites, Android configuration checks,
and all 16 fuzz-harness self-tests passed. The user confirmed on the Pixel that
Äppel has no pencil while custom suggestions retain theirs. This device check used
the development app through Metro; loading recovered after a cache-clearing server
restart.

Release preparation also pins `eas.json` to LF in `.gitattributes`: Windows Git
checkout had changed its line endings, producing a different Expo fingerprint
with identical settings. The LF checkout restores compatibility with the installed
everyday APK without overriding the runtime or modifying native configuration.

## Everyday Expo updates

Continues on `feature/app-variants`. Existing production APK already includes
Expo Updates and automatic launch checks; no new native dependency, configuration,
data reset, or GitHub APK updater. New Settings controls check/download compatible
updates and restart only on request after saving the list. Dev stays on Metro.
English and Luxembourgish controls include retry/offline states and update IDs.

| File group | Disposition |
|---|---|
| `src/components/UpdateSetting.tsx`, Settings screen | Production-only native update controls, pending/download/error handling, explicit restart with persistence and sharing-transition checks |
| English/Luxembourgish dictionaries and review reports | Twelve update strings; local dictionary spelling review |
| `scripts/update-production.cjs` | Fixed Android/production target, explicit target APK, remote fingerprint match required before publication; no automatic CI publishing |
| Update component, Settings and publisher tests | Native update mocks, no implicit reload, no publication on wrong build/runtime, offline retry and persistence-failure coverage |
| `docs/development.md` | Publishing, fingerprint constraints, phone verification and rollback workflow |
| Expo project production environment | Plaintext APP_VARIANT=production so EAS Update resolves the everyday app |

Validation: all 521 tests in 52 suites pass (10 new update-control cases and 5
publisher safety cases), TypeScript and Android checks pass, all 16 fuzz-harness
checks pass. Hunspell checked 537 UI/catalog entries with zero unresolved findings.
Production Hermes export succeeded. No dependencies or lockfile changes.

First production OTA published on 2026-11-07:
- Group: `e4644aeb-8d20-438e-8144-b2671297b22c`.
- Android update: `01a1b576-0fe6-7216-ada2-7ded3787bd3a`.
- Runtime: `c1cfabf69b96d9c0b35bb5bdeaa31b6c070c623b`, identical to everyday APK 1.0.12 (2).
- Production update endpoint returned HTTP 200 and this exact update ID when
  requested with the installed APK's Android runtime/channel headers.
- Pixel checks confirmed on 2026-11-07: update 01a1b576 arrived without an APK
  reinstall, with existing shopping data and language retained. The manual online
  check correctly reported no newer update; airplane mode produced a retryable
  error while the list remained usable. Update delivery on the second phone was
  also confirmed. The explicit pending-update Restart button was verified with
  the follow-up release below.

Fingerprint investigation found no native-code change: adding an npm script and
moving the ignored generated Android folder changed fingerprint inputs. Keeping
those original inputs restored an exact match. Publication uses a standalone
script; compatibility policy/runtime are never overridden.

Restart verification release (same app code), published on 2026-11-07 at the
user's request: group `75980ecc-0d19-47ab-90e1-65f90a95b973`, Android update
`01a1b57c-4cab-7ea3-84ba-145bab4fe26e`, same runtime as the first OTA.
The production endpoint serves the new ID. The user confirmed that Check for
updates → Restart to update reopened the app with items and language intact,
and Settings showed the new update ID 01a1b57c.

## Two installed Android variants

Branch `feature/app-variants` from main `1a6b8db`. Dev retains its package,
signing identity and data; the everyday app uses `io.github.haan.grocerylist`
with independent storage. No database migration or Nostr protocol change.

| File group | Disposition |
|---|---|
| `app.config.js`, `app.json` | Dynamic variant overlay on the retained shared base; distinct name, package, invitation scheme, adaptive icon and native launch background. Disable the shared generated Expo scheme. |
| `eas.json`, `package.json` | Explicit development/production APK profiles, environments and channels; replace the former preview command with build:production. No dependency change. |
| `src/sync/shareConfig.ts`, `share.ts` | Derive invitation scheme from native package; reject cross-variant and arbitrary URLs while retaining same-variant existing invitations. |
| `src/sync/__tests__/share.test.ts`, `scripts/check-android.cjs` | Cover both link identities, cross-variant rejection, both build profiles and invalid/mismatched variant selection. |
| `docs/development.md` | Installation, separate test/household lists, APK release steps and local native regeneration. |

Validation: TypeScript, all 506 tests in 50 suites, 16 fuzz-harness checks,
Android variant checks and Expo Doctor 21/21 passed. The 10 additional tests
come from running invitation coverage for both variants and rejecting cross-variant
links. Generated Android manifests have only their respective invitation schemes,
correct app names/package IDs and en/lb locale support. No dependency or lockfile
changes were needed.

Pixel checks confirmed on 2026-11-07: both apps coexist with separate data;
the everyday app retains an added item after closing and reopening in airplane
mode, without Metro. Updating Dev to 1.0.12 (7) confirmed the distinct purple
icon; the initially identical icons came from the older Dev installation.
Both EAS builds finished successfully. Two-phone testing of these variants
remains deferred; cross-variant invitation rejection is covered by automated
tests but has not been checked on devices.

EAS builds from this working tree:
- Everyday 1.0.12 (2): `9b8210ac-c3d5-4c33-9966-dd09bada49ea`; new remote signing key.
- Dev 1.0.12 (7): `b34cc2bf-f7bb-4156-9162-208ef5f7f3e8`; existing remote signing key.

Both uploads exclude generated native projects, local dictionaries and credentials.
Metro's manifest was verified to resolve to Grocery List Dev.

## Luxembourgish interface and shopping labels

Branch `feature/luxembourgish`, based on main `731412a` (2026-11-07).
154 complete Luxembourgish interface strings cover app controls, confirmations,
accessibility, errors and sharing status. System/English/Lëtzebuergesch choices
remain device-local. Expo Localization 57.0.2 supplies Android language preferences
and native en/lb declarations; the obsolete seven-language custom plugin is removed.
No iOS/web app targets or translation framework were added.

All 371 products have explicit shopping-usage decisions: 136 plurals, 162 mass
names, 64 ambiguous names kept without assuming packaging, and 9 collectives.
Stable IDs, old aliases, aisle keys and shared-learning identities remain.
The parser distinguishes standalone plurals from n-rule variants; reviewed
qualified phrases keep separate identities. Starter products use IDs. The manifest
is the editorial source; destructive bootstrap regeneration is disabled.
Built-in labels correct Vorrat to Spënnchen and Snacks to Snacken; stored keys
remain Pantry and Snacks.

The authorized `luxembourgish-shopping-v1` reset runs transactionally before
hydration/sync, replacing all test shopping/history/aisle/sharing state with one
empty private list. It preserves appearance/language and earlier migration markers.
Fresh installations and subsequent launches use the same idempotent path; rollback
preserves old data on failure. Old relay data is not purged; update both test phones
and pair them again. There is no Nostr payload or item-schema change.

| File group | Disposition |
|---|---|
| `src/i18n/lb.json`, locale registry/preference/formatting | Complete translation, native preferred-language order, local override and foreground refresh |
| `src/data/`, `scripts/lod/` | Reviewed names, provenance, preserved aliases/IDs, deterministic output and before/after report |
| `src/store/db.ts` | New one-time pre-release shopping reset; no other tables or storage contracts removed |
| `scripts/language/` | Developer-only pinned Hunspell/Docker workflow, checksum-verified download, context-specific spelling exceptions and glossary |
| `docs/luxembourgish-*.md` | Generated interface comparison and spelling review; no dictionary copied into application |
| `plugins/withAndroidLocaleConfig.js` | Removed; Expo Localization owns Android en/lb resources |
| Retained tests | Updated catalog-label fixtures; full existing regression coverage kept; added translation, catalog and bilingual layout coverage |
| `tmp/lb-spelling`, generated `android/`, bundle outputs | Ignored local validation resources; dictionary/XML/signing material excluded from EAS upload |

Spelling review uses the pinned official dictionary (EUPL 1.1) and Hunspell 1.7.2
in a network-disabled container, with LOD-backed exceptions documented by context.
It checks 154 interface strings and 371 labels. This is a spelling audit, not proof
of grammatical or idiomatic perfection; final wording/layout review happens on the
Pixel. See [review](luxembourgish-review.md), [spelling findings](luxembourgish-spelling.md)
and [catalog decisions](../scripts/lod/review.md).

Automated validation (2026-11-07): clean npm ci, TypeScript, 496 tests in 50 suites,
all 16 fuzz-harness self-checks, Android configuration guard, Expo dependency checks
and Expo Doctor (21/21) pass. The count increases from 457/48: +16 catalog cases,
+6 locale selection/restoration cases, +1 interpolation-parity check, +2 existing
Voice Access cases applied to lb, +1 real language-picker round trip, and +13 existing
layout checks run in lb as well as en. No regression tests were removed. Catalog
regeneration is byte-identical; actual generated Android XML declares only en/lb
and attaches localeConfig to the application. Android Hermes export succeeds
(3,501 modules, 6.4 MB bytecode); the sandbox initially blocked spawning Hermes,
so the successful compiler run used the approved normal host permissions.

Development APK 1.0.12 (versionCode 6), build
[3d0aa2e9-da74-4608-ae22-86b7df6a5f71](https://expo.dev/accounts/lean-mean-coding-team/projects/grocery-list/builds/3d0aa2e9-da74-4608-ae22-86b7df6a5f71),
was submitted using the existing project/package and remote signing key. Metro
serves the Android launch manifest and bundle successfully at http://10.1.0.20:8081.
The final offline spelling run checks 525 entries: 80 documented findings,
zero unresolved. All 30 targeted language tests also pass after wording refinement.

Pixel confirmation (2026-11-07): the user installed the rebuilt APK and confirmed
the one-time empty/private startup in Luxembourgish, then persistence of a new
item and the selected language after restart. Initial list/wording review was
positive, with further wording refinements welcome during use. Exhaustive screen,
large-font/theme, English/System round-trip and two-phone checks remain unconfirmed;
prior-phase phone confirmations do not constitute acceptance of those scenarios.

## Add-item details form (previous phase)

Icon follow-up (2026-11-07): the user selected concept 17, the coral basket on
teal. Retain the approved raster master, generated transparent foreground, and
prompt/export metadata in `assets/`. Replace the launcher/adaptive/native-launch
PNGs and set the native backgrounds to `#05515F`. The custom splash remains
removed. Replace the obsolete SVG renderer with exports using Expo's existing
image utilities; remove the old cart SVG and now-unused Chrome locator. No
dependency, package identity, signing, or data changes. All exports are 1024px;
the adaptive foreground's opaque artwork fits inside Android's 66/108 safe
circle. A new APK is required for device verification of the native assets.
Validation: TypeScript, Android configuration guard, all 16 fuzz-harness checks,
resolved Expo prebuild configuration, and all 457 tests in 48 suites pass
(`tmp/icon-startup-tests.json`). PNG exports were inspected for dimensions,
transparency, and foreground safe-area bounds; launcher-mask previews are in
`tmp/icon-concepts/final-preview.html`. Development APK build
`11e088dc-f518-4b8b-88e5-e1bf980e945d` was submitted on 2026-11-07 using the
existing Expo project, Android package, and remote signing key; versionCode 5.
The user installed the finished APK as an update and confirmed on the Pixel that
the teal basket appears on the home screen and during startup, with the existing
list and sharing setup intact. Native device acceptance passed on 2026-11-07.
The Expo project dashboard icon was also updated successfully with
`eas project:icon:set assets/icon.png --non-interactive`.

Startup follow-up: remove `src/components/AnimatedSplash.tsx`, including its
"josh approved" wordmark, extra font wait, and timed intro/exit. `AppShell` now
reveals the laid-out app or startup error directly from Android's native launch
screen. `App.tsx` still holds that native screen during hydration. Native assets,
configuration, dependencies, and stored data are unchanged. Startup regression
tests cover readiness gating, immediate layout handoff, repeated layout, and
error content without a navigator. TypeScript, Android configuration, and all 16
fuzz-harness checks pass. The full run passed the existing 455 tests (47 suites);
the new suite initially needed native-boundary mocks corrected, then both startup
tests passed in its targeted rerun. The user confirmed on the Pixel that startup
goes directly from the native icon screen to the list without the branded animation.

Branch: `ui/add-item-flow`, based on clean main `f7adbdf0` after PR #1 merged
the Android-only/single-list work. This phase does not commit, push, or merge
without a subsequent request. Earlier no-merge statements below describe their
original delivery state.

| Files/group | Disposition |
| --- | --- |
| `src/data/itemDraft.ts` | New ephemeral create/edit/re-add model, strict quantity validation, latest-snapshot field updates, duplicate/deletion/aisle conflict checks, and atomic construction of item + aisle + learning changes. |
| `src/store/lists.ts` | New `saveItemDraft` action emits/persists one complete list snapshot and records Recent once for successful additions/re-additions. Retains legacy primitives used by existing sync simulations. |
| `src/components/ItemEditor.tsx` | Shared draft editor with explicit Add item/Save and Cancel outside scrolling fields; staged aisles, inline conflicts, and unchanged Remove/Undo callbacks. |
| `src/components/Stepper.tsx` | Optional direct numeric input alongside existing accessible +/- controls. |
| `src/components/ItemPicker.tsx`, `AddItemsSheet.tsx` | All selection paths open details; custom action remains below search, close icon replaces Done, success clears/refocuses search; Recent editing/forgetting/Undo retained. |
| `src/components/AddAction.tsx` | Optional filled primary treatment for the Add-items action, with a leading plus and stronger label; existing home/aisle actions retain their styling. Picker spacing and centered empty-state presentation refined after Pixel feedback. |
| `src/i18n/appStrings.ts` | English form actions, validation/conflict explanations, and accurate empty-state copy replace immediate-add instructions. Catalog/aisle labels/aliases unchanged. |
| `src/store/__tests__/itemDraft.test.ts`, `src/components/__tests__/AddItemsFlow.component.test.tsx` | New atomic-store and end-to-end form coverage, including Plastiktut, remote edits/conflicts, staged aisles, re-addition, and compatible snapshot merging. |
| Existing ItemEditor, ItemPicker, and home tests | Updated immediate-add/autosave assertions to require confirmation. Recent and removal regression coverage retained; no test files removed. |
| `docs/development.md`, this audit | Document draft/save semantics, unchanged runtime/data compatibility, and physical-device acceptance. |

No package, lockfile, SQLite, native, or Nostr wire-format changes. No APK rebuild,
data reset, or sharing identity rotation. Automated and physical-device results
are recorded separately; the requested Pixel walkthrough passed, while the
second-phone check remains pending.

Validation: TypeScript and Android configuration checks pass; all 16 fuzz-harness
self-tests pass. After the visual follow-up, TypeScript and the complete retained
suite pass: 431 tests in 46 suites (`tmp/add-flow-visual-tests.json`), up from 387
in 44. Added coverage comprises 29 store/draft cases, 14 Add-items integration
cases, and one Android quantity-selection regression. No tests were removed;
existing autosave/quick-add tests were
adapted to the agreed explicit-confirmation behavior. The Android startup manifest
and Metro bundle return HTTP 200. On 2026-11-06 the user confirmed the Pixel
Plastiktut flow (quantity 6, note, aisle, one complete item, cleared/focused search),
keyboard/scrolling/button access, suggestion cancellation, existing-item Save/Cancel,
and cancellation of a drafted new aisle. No second-phone test was performed for
this phase; complete-details delivery and learned assignment remain pending.
Additional device-only cases not explicitly confirmed remain unchecked in the
development guide; earlier two-phone results do not validate this new flow.

Visual follow-up: inspected the updated Pixel screen through a read-only ADB
screenshot with a search query and keyboard open. The filled action, search spacing,
and centered no-results message render without overlap. This visual inspection does
not substitute for the pending second-phone synchronization check.

Alphabetical-browser follow-up supersedes the always-visible Add action and
frequency-ranked suggestion UI above. `src/data/suggestionBrowser.ts` combines the
entire catalog and personal Recent names into letter groups; filtering recognizes
confirmed aliases and normalized accents/whitespace without truncating results.
The browser starts with the keyboard hidden. Only a nonempty filter with no
matches offers custom creation; Enter obeys the same rule. Existing details,
learning, history records, and synchronization are unchanged. A noninteractive
letter bubble follows scroll position while dragging/coasting, then fades; reduced
motion disables the fade. A–Z layout was inspected on the Pixel. On 2026-11-06
the user confirmed browsing, the letter bubble updating and disappearing after
scrolling, filtering, and Add appearing only for no matches. Added seven
catalog-browser cases and one scroll-letter/timer regression; existing flow and
layout tests now exercise the new browsing contract.
Validation for this follow-up: TypeScript passes and all 439 tests in 47 suites
pass (`tmp/browser-tests.json`). No dependency, native, storage, or protocol changes.

Loading follow-up: the user reported an initially short list that grew in batches,
then fast scrolling that outran row creation. The final browser renders the full
371-product catalog plus personal entries/headings as its initial region and keeps
native rows attached while open, replacing the earlier limited rendering batches.
This uses more view memory while open in exchange for immediately available rows.
Catalog sorting and normalized aliases are prepared once; history changes merge
personal entries into that index. A bounded 12-query cache never limits result
counts and is invalidated when personal names change. Stable styles/callbacks and
animated bubble positioning avoid rerendering rows on every scroll event.

Added regression coverage for complete initial rendering, cache reuse,
rename/forget/Undo invalidation, and cache eviction without truncation. An isolated
desktop comparison preserved all results across 36 query/history combinations;
it is not an Android startup-time measurement. Opening speed and fast scrolling
on the Pixel have been requested for this final version and remain unconfirmed.
Final automated validation: TypeScript and all 443 tests in 47 suites pass
(`tmp/browser-eager-tests.json`); the complete initial-render and scrolling-hint
regressions pass without native-animation warnings.

Retained-browser follow-up: the user confirmed that eager rendering removed the
growing-list effect but measured roughly two seconds to open. Android's native
Modal discards hidden content, so each opening was still mounting all rows.
`AddItemsSheet.tsx` now prepares a full-screen layer in an idle React transition
after home can paint and retains that layer between visits. Visibility uses
opacity, touch gating, and accessibility exclusion rather than unmounting.
`ListsHomeScreen.tsx` excludes underlying controls while the layer is visible;
the layer handles Android Back only while open. `ItemPicker.tsx` is memoized and
resets hidden query/scroll/snackbar state while cancelling pending focus.
`ItemEditor.tsx` exposes its existing discard action so hiding the browser cannot
leave a stale native details dialog open. No route, database, or native dependency
change. Memory for prepared rows is retained until the current home/list unmounts;
a first visit before background preparation finishes may still pay that cost.

`qa/nativeInput.setup.cjs` adds the idle-scheduling native boundary omitted by the
Jest preset. Added tests prove that hidden preparation and reopening preserve the
same row instances, hidden content cannot be focused through accessibility, Back
listeners are removed on close, and home controls become available afterward.
On 2026-11-06 the user confirmed repeated openings, Android Back, and home controls
work with this version, but the first opening remains noticeably slower. Record
this as improved repeated access with a remaining cold-preparation cost, not as
instant startup. TypeScript and all 445 tests in 47 suites pass
(`tmp/browser-retained-tests.json`).

Queued-browser follow-up: replace the single large initial mount with a screenful
and idle batches of 24 rows in `src/components/useQueuedRows.ts`. The queue advances
after each commit without scroll events and continues when Add items is hidden.
All admitted rows remain mounted. `ItemPicker.tsx` keeps the alphabetical view
behind filtered results instead of discarding it, while matching searches against
the full catalog immediately. A preparation footer replaces blank unloaded space.
The cache remains in memory for the current home/list instance, not across app
restarts. No persistence, protocol, native dependency, or APK change.

Updated component coverage checks partial initial rendering, eventual complete
rendering without scrolling, immediate lookup of unprepared products, completion
while hidden, and row identity across searching/closing/reopening. This supersedes
the earlier assertion that every row should mount in the initial render. On
2026-11-06 the user confirmed on the Pixel that the first screenful appears faster,
the complete list is ready for fast scrolling after closing/waiting/reopening,
and searching for “Zopp” immediately works during preparation. This is qualitative
device acceptance; no numerical opening-time measurement was taken.
TypeScript and all 446 tests in 47 suites pass (`tmp/browser-queue-tests.json`),
including the strengthened hidden-completion test and one new filter/cache test.
Android configuration and all 16 fuzz-harness self-checks pass. Metro serves the
updated Android development bundle successfully (HTTP 200).

Partial-match creation fix: a nonempty filter now offers Add “…” whenever no
exact normalized name or confirmed alias exists, even if partial suggestions are
visible. This supersedes the earlier no-results-only rule. “glace” can open its
own details draft alongside Äerdbiersglace and Bananneglace; Enter follows the
same rule. Exact matching also includes personal Recent names. Regression tests
cover partial matches, button/Enter, cancellation, complete save, and subsequent
exact Recent matching, plus case/accents/whitespace and foreign aliases.
TypeScript and all 448 tests in 47 suites pass (`tmp/browser-partial-tests.json`).
The user confirmed on the Pixel that searching for “glace” shows both flavour
suggestions and Add “glace”…, and that Add opens the details form with “glace”
as the name.

Item-form polish: `ItemPicker.tsx` capitalizes the first character when passing
a selected/typed name into the details form. Existing items still use their stored
names; remaining characters and subsequent manual edits are unchanged. Removed
the note example placeholder and its unused translation key. Updated the existing
“glace” flow regression to expect “Glace” in the draft and saved item.
TypeScript and all 448 tests in 47 suites pass (`tmp/item-prefill-tests.json`).

Aisle-creation simplification supersedes the draft-only New aisle shortcut above.
The shared Add/Edit item form now selects existing aisles only; creation remains
in Settings → Manage aisles. Removed the inline input, related state/styles and
unused strings, plus draft-aisle staging and commit logic in `itemDraft.ts`.
Retained the naming placeholder consumed by Manage aisles. Updated existing tests
to check selection/cancellation/learning with existing custom aisles and preserve
the latest aisle order when saving. No persisted data or sharing format changes.
TypeScript and all 448 tests in 47 suites pass, including Manage aisles coverage
(`tmp/manage-only-aisles-tests.json`).

Compact item form: reorder fields to name, quantity, aisle, note. Replace wrapped
aisle chips with one selection row and a scrollable vertical chooser inside the
same modal, marking the selected aisle. Cancel/scrim/Back from the chooser retains
the item draft. Note starts at one-line height, expands to content, then scrolls
internally at 160 logical pixels. Keep form actions outside scrolling fields and
enable Android keyboard avoidance. Existing explicit-selection learning remains
deferred until Save, including selecting the current aisle.

TypeScript passes. Full suite: 448/449 passed; the new chooser dismissal test
initially matched both the browser and modal Close buttons. Scoped it to the
modal scrim; all 18 item-flow tests then pass (`tmp/compact-item-flow-tests.log`).
All other 46 suites passed (`tmp/compact-item-tests.json`). Pixel inspection
confirmed the compact form and visible Cancel/Save above the keyboard. The user
also confirmed on the Pixel that aisle selection/cancellation works, the note
expands naturally, the actions remain reachable above the keyboard, and the
layout feels better. No item changes saved during automated layout inspection.

Edit-form action polish: move Remove from the large red panel below Note to a
trash icon at the right of the form header. Keep a full minimum-size touch target
and the existing accessible Remove label. Cancel and Save stay at the bottom;
the original removal callback, discarded unsaved edits, and Undo are unchanged.
TypeScript and the complete suite pass: 449 tests in 47 suites, including removal,
Undo, and the corrected chooser-dismissal regression (`tmp/edit-trash-tests.json`).

Aisle-form consistency: `usePrompt` gains an opt-in sheet presentation and field
label, used by Add aisle and Rename aisle in Manage aisles. Match item-form
spacing, field styling, equal-width actions, and Android keyboard avoidance.
Other prompts and confirmation dialogs keep their existing presentation. Preserve
the one-time native selection implementation and all naming/store behavior.
Extend its selection regression to both presentations; the complete suite passes
with 450 tests in 47 suites (`tmp/aisle-sheets-tests.json`), and TypeScript passes.
Pixel inspection confirms the Add aisle sheet and both buttons above the keyboard;
no aisle was saved during that inspection. The user confirmed on the Pixel that
Rename selects the original name automatically, replacement preserves the first
typed character, tapping at the end allows appending, and buttons remain reachable
with the keyboard open.

Confirmation-dialog polish: keep centered placement but use larger, higher-contrast
body text and the same equal-width, minimum-52-pixel actions as the form sheets.
Cancel has an outline; destructive confirmation uses the existing danger color
with light foreground text. Long messages scroll within a bounded card, keeping
the action row outside the scrolling content. This applies to aisle removal and
sharing confirmations. Callbacks and cancellation behavior are unchanged. Shared
form-button styles now have generic names; add light/dark contrast coverage for
the destructive button's foreground/background pair.
The user confirmed on the Pixel that the text and buttons look balanced and
Cancel closes the confirmation without removing the aisle.
TypeScript and all 452 tests in 47 suites pass (`tmp/confirm-polish-tests.json`).

Settings grouping: add a Shopping list section above Sharing and Manage aisles,
separate from Language. All three section labels expose heading semantics to
accessibility services. Navigation and settings behavior are unchanged.
TypeScript and all 452 tests in 47 suites pass (`tmp/settings-sections-tests.json`).

Sharing-screen hierarchy: show connection/rejection state and last peer contact
in a compact panel with one accessible Sync now refresh button. Group invitation
instructions, unchanged QR/link, Send link, and access warning together. Put the
outlined Scan a list code action under Join another list, followed by a smaller
red Stop sharing action. Preserve private/pending states, permission handling,
confirmation gates, identities, and synchronization behavior. Pending lists keep
refresh/stop controls and cannot expose invitations before receiving their data.
Add a theme-aware destructive-text color for readability on both backgrounds.
Tests retain relay-versus-peer status semantics and cover refresh while pending;
contrast checks cover the new text color. Pixel inspection confirms the grouped
layout, readable QR, visible actions, and reduced whitespace without changing any
sharing settings.
TypeScript and all 455 tests in 47 suites pass (`tmp/sharing-layout-tests.json`).
The user confirmed on the Pixel that the new layout is clearer, refresh works,
and opening then cancelling Stop sharing preserves the sharing setup.

## UI coverage review — remaining work

Recent-suggestion follow-up: `ItemPicker` now opens the shared prompt's sheet
presentation directly, removing its action-menu instance. Add an optional labeled
destructive header action to the prompt, using the theme-aware text/icon color.
Keep the one-time native name selection and existing history rename/forget/Undo
operations. Update regression coverage to check direct opening, scope copy,
forgetting with an unsaved draft name, and preservation of an existing shopping
item through rename/forget/Undo. TypeScript and all 455 tests in 47 suites pass
(`tmp/suggestion-sheet-tests.json`). The user confirmed the flow on the Pixel,
including direct opening, name selection, reachable buttons, rename, and
Forget suggestion → Undo while the shopping-list item remains unchanged.

Reviewed all four registered routes, every first-party modal/prompt caller, and
startup, error, empty, scanning, and pending-sharing states. This is a source and
component review alongside the Pixel checks recorded above; rare/error states
were not deliberately triggered on the user's phone. No application code changed
as part of this review.

| Surface | Finding |
|---|---|
| Shopping list, checked section, clear-leftovers banner, empty list, sharing footer, Undo | Present and accounted for; list-row/checked-state design has not had a dedicated visual redesign in this pass. |
| Add items browser, filtering, no matches, queued preparation | Updated; Pixel acceptance recorded above. |
| Add/Edit item and aisle chooser | Updated; Pixel acceptance recorded above. |
| Recent suggestion Edit/Delete menu | Resolved: removed from this flow; pencil now opens the name editor directly. |
| Recent suggestion name editor | Resolved: Edit suggestion bottom sheet with a labeled, initially selected name, scope explanation, Cancel/Save, and a header Forget suggestion action with Undo. |
| Settings | Section grouping updated. |
| Language picker | Already a bottom sheet; header/row spacing, selected-row treatment, and X accessibility label (Done) differ from the new chooser patterns. Minor consistency work. |
| Manage aisles, Add/Rename aisle | Updated; X still has the accessible name Done rather than Close. |
| Sharing: private/shared, invitation, Stop sharing | Updated; Pixel acceptance recorded above. |
| Join/replace confirmation, aisle removal confirmation | Use the updated shared confirmation component. |
| Pending shared list, on home and Sharing | Waiting copy still instructs users to keep the sharing phone online, overstating the requirement with store-and-forward. It should distinguish waiting for a stored copy from recovery when none is available. |
| QR scanner | Existing simple camera-and-instruction layout. Permission denial silently returns to Sharing; a denied-permission explanation/recovery action is missing. |
| Startup data-load failure | Uses unstyled body text and the native Button instead of app typography/actions. |
| Render-error fallback | Already uses theme typography and spacing; tells the user to reopen. No recovery redesign in this review. |
| Splash | Existing launch animation; no new form/dialog inconsistency. |

Cross-cutting follow-up: standalone destructive/error text and icons in the
Recent menu, item editor, and Manage aisles still use the old dark red token.
That color has approximately 2.87:1 contrast on the dark elevated background,
below the normal-text target. Use the newly added theme-aware dangerText token
for text/icons, preserving the separate solid destructive-button background.

## Single-list simplification (previous phase)

This phase supersedes earlier multi-list, favorites, and import/export decisions
below. Prior phases remain recorded as history, not as the current UI contract.
The work is delivered on cleanup/android-only; no main merge.

- ListsHomeScreen now renders shopping items directly, with a fixed Grocery List
  heading, Sharing and Settings actions, and a compact bottom connection status.
  ListDetailScreen and the old overview, naming, duplication, deletion, and
  creation controls are removed. Settings owns Sharing and Manage aisles.
- Favorites/Usuals and their persistence/actions are removed. Recent ranking,
  editing, forgetting and Undo, catalog suggestions, item editing, and aisle
  learning remain. No file import/export remains.
- Database initialization performs the requested single-list-v1 reset once, in
  one transaction: old lists/identities/items/custom aisles/preferences, history,
  favorites and obsolete sync bookkeeping are cleared, and one private empty list
  plus its marker are inserted. Subsequent starts retain data. Failed resets roll
  back and show Retry. Appearance/language (AsyncStorage) and diagnostics remain.
- Sharing starts only through an explicit action. All identity replacements are
  durable before completing. Pending joins survive restart, request a snapshot,
  and cannot edit or publish until a validated snapshot is adopted. Stop sharing
  keeps a private copy; starting again creates a new secret. Stale writes/callbacks
  cannot resurrect the previous identity. Wire format, encryption, relay slots,
  clock semantics, and established-list merges remain compatible.
- Native expo-document-picker and expo-sharing and the sharing config plugin
  were removed. expo-file-system remains for local diagnostics; camera and React
  Native Share remain. No retained dependency version changed.

| Files/group | Current disposition |
| --- | --- |
| App.tsx, src/shell/AppShell.tsx | Direct items route, ordered initialization, startup error/retry, deferred share-link confirmation. |
| src/screens/ListsHomeScreen.tsx | Retained item interactions; compact sharing footer and no list management. |
| src/screens/ListDetailScreen.tsx | Removed; item UI moved to home. |
| src/screens/SettingsScreen.tsx, ShareScreen.tsx | Sharing lifecycle, confirmation/scanning, aisle access, retained settings. |
| src/components/SharingFooter.tsx | New compact, tappable sharing status. |
| src/components/ItemPicker.tsx, ItemEditor.tsx, AddItemsSheet.tsx | Remove favorites and named-list toast; preserve Recent and item interactions. |
| src/store/lists.ts, db.ts, account.ts; src/storage/kv.ts | One-list invariant, atomic reset/replacement, serialized saves, pending metadata; remove favorites and generic list-management helpers. |
| src/sync/index.ts, share.ts, validateList.ts | Pending snapshot gate, old-channel guards, validated codes/snapshots; existing list protocol retained. |
| src/lib/transfer.ts, src/lib/__tests__/aisleTransfer.test.ts | Removed with file import/export. |
| src/store/__tests__/kitRemoval.test.ts | Replaced by singleListMigration.test.ts; real SQLite tests cover the superseding reset and rollback. |
| qa/singleListFixture.ts | Test-only installation fixtures for retained store/merge simulations; never imported by the app. |
| Retained component/screen/store/sync/layout/i18n tests | Updated for one list, confirmation, pending states and removed entry points; original intent/convergence suites retained. |
| package.json, package-lock.json, app.json, scripts/check-android.cjs | Remove native file-transfer modules/plugin and guard against their return. |
| README.md, ARCHITECTURE.md, PRIVACY.md, docs/development.md, scripts/lod/README.md | Current one-list workflow, local reset, sharing/privacy and device checks. |
| Other retained files | Keep their previously audited disposition. MIT, third-party/font and LOD attribution unchanged. |

Validation: clean npm ci, TypeScript, Android configuration guard, 16 fuzz-harness
self-tests, Expo dependency check, Expo Doctor 21/21, and 387 Jest tests in 44 suites
passed. Metro Android manifest and bundle return HTTP 200; configured package is
io.github.haan.grocerylist.dev and platforms is Android only. Android manifest
introspection also succeeds, and native autolinking excludes both removed file-transfer modules.

Test-count comparison against the immediately preceding 388-test/45-suite phase:

| Suite/group | Before | After | Explanation |
| --- | ---: | ---: | --- |
| ListsHomeScreen | 3 | 2 | Retire whole-list delete confirmation; test direct item home. |
| ItemEditor | 9 | 8 | Remove favorite action test. |
| ItemPicker | 8 | 5 | Remove three favorite/Usuals tests; keep Recent and entry tests. |
| SettingsScreen | 7 | 5 | Remove import/export actions. |
| aisleTransfer | 2 | 0 | Remove file-transfer feature tests. |
| kitRemoval → singleListMigration | 3 | 4 | Superseding atomic reset, restart, rollback, pending-state and stale-write checks. |
| ShareScreen | 6 | 9 | Explicit start, cancellation/reopening a link, duplicate-scan and stop-sharing checks. |
| sync/engine | 39 | 43 | Replace multi-list fixture with stale-channel regression; add pending/invalid-snapshot, stop/restart and failed-replacement checks. |
| Other suites | 311 | 311 | Retained regression coverage, adapted setup where needed. |

Fresh native development build submitted using the existing EAS project and
remote signing key: [29808259-1b41-4e50-b878-27df94a0177e](https://expo.dev/accounts/lean-mean-coding-team/projects/grocery-list/builds/29808259-1b41-4e50-b878-27df94a0177e).
Version code 4 finished successfully in EAS. The user installed it as an update
on the Pixel and confirmed that startup through Metro works and the current
item and sharing state remain intact.

Pixel checks through Metro: confirmed by the user. The one-time reset produced
one empty private list; an item survived the next restart. Direct item home,
Sharing/Settings header, status footer, and absence of list naming/overview were
confirmed. Add/edit/check/Undo, Luxembourgish suggestions, learned aisles, Recent,
aisle dragging/renaming, and removal of favorites/import-export all work.
Opening Sharing stays private; cancellation and confirmation of Stop sharing
work, items remain, and starting sharing again produces a different QR code.
Two-phone sync: the user confirmed pairing and bidirectional item additions,
quantity edits, check-offs, and aisle corrections. Re-adding the corrected product
on the other phone uses the learned aisle. With Wi-Fi and mobile data disabled on
the second phone, independent edits on both phones converged after reconnecting
without losing either phone's changes, including after reopening the apps.
The two-phone testing deferral is resolved; automated simulations also pass.

## Initial Android-only cleanup: decisions and boundaries

- Keep the current Android app, LOD catalog, learning/aisle management, kits,
  persistence, sharing, accessibility, and local diagnostic privacy checks.
- Remove first-party Apple/Siri/web support, disabled commerce/review/promotion,
  unused email reporting, upstream marketing, old English scratch data, and legacy
  factory/emulator QA. All removed tracked content remains in Git history.
- Retain only active QA mocks, sync-fuzz/replay support, and layout audits. Remove
  runtime demo seeding; retain the sample-list regression fixture in test-only support.
- Preserve MIT/third-party/font/LOD attribution, app package, Expo project, signing
  key, database format, and Nostr payload/merge semantics. No app redesign or upgrade.
- Third-party packages and developer host-platform support are not app targets.
  Expo/Jest transitive Apple/web dependencies remain when required by those tools.
- No secrets, local LOD XML, installed dependencies, build output, or caches belong
  in this audit's tracked-file manifest. tmp/ remains ignored. Historic local QA
  outputs stay ignored to prevent accidental publication from older checkouts.

## Validation

- Clean npm ci completed. Removed unused native purchase/mail packages; no retained lockfile package version changed. Expo install check passes; Expo Doctor 21/21.
- TypeScript passes. Android-only configuration guard passes. Fuzz-harness
  self-tests: 16 passed, including portable generated artifact paths on Windows.
- Jest Android preset: 453 tests, 47 suites passed.
  An explicit Babel preset supports the Android test runner and Metro.
- Metro startup manifest and Android bundle both return HTTP 200.
- Comparison of emitted JavaScript for 18 retained sync, database, domain, and
  import/export files found no behavioral differences from the baseline.
- New EAS development APK: build 7b08eb63-e83d-4e5c-8d4e-265b32fb3816,
  Android versionCode 3, using the existing signing key. Status: FINISHED;
  installed as an update on the Pixel 8 on 2026-11-06.
  [Build page](https://expo.dev/accounts/lean-mean-coding-team/projects/grocery-list/builds/7b08eb63-e83d-4e5c-8d4e-265b32fb3816).
- Pixel startup and data retention: confirmed by the user on the rebuilt APK;
  the app opens through Metro and existing lists remain intact.
- Pixel feature checks: all confirmed by the user on the rebuilt APK on
  2026-11-06: settings/feedback, add/edit/check, Luxembourgish suggestions and
  learned aisle corrections, aisle drag ordering, rename initial selection,
  replacement and appending, kit additions, and test-data export/import.
- Two-phone sync was deferred during this phase while the second phone charged.
  Physical checks were subsequently completed in the single-list phase above.

### Test-count changes

Before cleanup: 525 tests. After cleanup: 453.
The following groups account for the change; other retained suites keep their
coverage. FundingFooter becomes FeedbackFooter, retaining feedback checks.

| Test group | Before | After | Reason |
| --- | ---: | ---: | --- |
| FeedbackFooter.component | 0 | 2 | Rename footer; remove donation callback test. |
| FundingFooter.component | 3 | 0 | Rename footer; remove donation callback test. |
| MoreFromJA.component | 1 | 0 | Remove deliberately deleted feature tests. |
| ReviewModal.component | 2 | 0 | Remove deliberately deleted feature tests. |
| ReviewModal.linkSafety | 10 | 0 | Remove deliberately deleted feature tests. |
| ScreenHeader.component | 1 | 0 | Remove unused generic component. |
| SettingsAbout.component | 6 | 0 | Remove deliberately deleted feature tests. |
| TipJarSheet.component | 3 | 0 | Remove deliberately deleted feature tests. |
| drain | 10 | 0 | Remove voice-assistant queue tests. |
| edgeInset.screens | 23 | 18 | Remove five deleted feature surfaces; keep Settings layout check. |
| feedback | 16 | 8 | Remove email composition/delivery tests; retain diagnostic privacy/readability. |
| launchNotice | 8 | 0 | Remove deliberately deleted feature tests. |
| reviewPrompt | 17 | 0 | Remove deliberately deleted feature tests. |

### Follow-up: upstream issue #19

The Lists home delete confirmation now uses the existing localized title and
message. Settings Appearance controls also use the existing translations,
including their accessibility labels. No native build or data changes are needed.
The user confirmed the corrected delete dialog on the Pixel through Metro.
Added seven list-confirmation tests (including cancel/confirm behavior) and seven
Appearance localization tests, covering English and all six translated locales.
After this fix, the full Android suite passes: 467 tests in 48 suites. TypeScript,
the Android configuration guard, and all 16 fuzz-harness self-checks pass. Metro's
Android manifest and bundle both return HTTP 200.

## Follow-up simplification (2026-11-06)

Baseline for this phase: a516299 on cleanup/android-only. This section supersedes
the earlier descriptions of retained kits, feedback UI, and translated interfaces.

| Area | Final disposition |
| --- | --- |
| App/navigation | Direct Lists stack route; remove bottom tabs, kit routes, acknowledgements route, and obsolete navigation types. |
| Lists/Add items | Remove feedback/branding footer and pull animation; item picker has no Items/Kits switch; preserve safe areas and ordinary scrolling. |
| Settings | Appearance, Language, export/import, standalone Version only; remove About actions and promotional footer. |
| Feedback code | Delete provider/context and browser-opening action; initialize bounded local diagnostics in AppShell. |
| Kits | Delete screens, pickers, ingredients UI, types, store, persistence functions, merge engine, timers, and kit-only list operations. |
| Database upgrade | Idempotent DROP TABLE IF EXISTS kits; preserve all other data, including list items originally added from kits. No relay deletion or remote wipe. |
| Synchronization | Preserve list messages, encryption, relay slots and clocks; ignore unsupported control messages without list merges or received-status updates. |
| Interface languages | Remove es/de/fr/it/pt-BR/ja and shell dictionaries. Keep English, System/English picker, translation registry and synthetic-dictionary tests. Retired saved choices migrate to System. |
| Catalog | Keep Luxembourgish products/aisle labels, LOD attribution, and French/German product aliases unchanged. |
| Dependencies | Remove only @react-navigation/bottom-tabs from the lockfile; no retained package version changes, no native dependency changes. |
| Attribution | Keep LICENSE, CREDITS.md, font licenses and LOD attribution; delete unused runtime credits data and screen. |

Validation: clean npm ci, TypeScript, Android-only guard, 16 fuzz-harness checks,
Expo dependency validation, and Expo Doctor (21/21) pass. Resolved config retains
Android-only platforms, package io.github.haan.grocerylist.dev, and Expo project
80882728-1f01-40c5-b4aa-56fcfa53f928. Metro Android manifest and bundle return 200.
No native rebuild is required. Real SQLite tests exercise fresh installs and two
successive opens of both legacy and current databases, verifying only kits are removed.
Real stack tests cover direct home navigation, Settings/back, and cold-start share links.

Full retained suite: **388 tests in 45 suites pass** (previously 467 in 48).
All differences are accounted for below; other suites retain their counts.

| Suite | Before | After | Reason |
| --- | ---: | ---: | --- |
| App.navigation | 0 | 2 | Direct Lists stack, back navigation, cold-start share link. |
| Credits.component | 2 | 0 | Removed screen. |
| FeedbackFooter.component | 2 | 0 | Removed footer. |
| KitDetailScreen.screen | 8 | 0 | Removed screen. |
| KitsHomeScreen.screen | 7 | 0 | Removed screen. |
| ListsHomeScreen.screen | 7 | 3 | Remove six locale cases; add home/Settings and direct picker/learning checks. |
| SettingsScreen.screen | 17 | 7 | Remove six locale and five removed-action cases; add simplified Settings check. |
| aisleLearning | 16 | 14 | Remove two kit-only cases; retain ordinary item/alias learning. |
| edgeInset.screens | 18 | 13 | Remove five retired surfaces; retain Android layout coverage. |
| engine | 43 | 39 | Remove seven kit-only cases; add three unsupported-control/status cases; adapt mixed tests to lists. |
| keyParity | 2 | 3 | Add app-wide literal-key validation against English. |
| kitRemoval | 0 | 3 | Real SQLite upgrade/fresh-install/idempotence checks. |
| kits | 6 | 0 | Removed store. |
| localePreference | 0 | 6 | Migrate each retired saved locale and retain English selection. |
| mergeKits | 14 | 0 | Removed merge code. |
| storeAndForward | 16 | 15 | Remove kit-only replay; retain list offline replay. |
| voiceControlNames | 28 | 2 | Remove retired locales and kit-only accessible labels. |

Pixel verification for this phase: confirmed by the user on 2026-11-06 after
closing and reopening the app. Existing lists remain; the bottom tabs and feedback
footer are gone; Settings shows Appearance, System/English language selection,
import/export, and Version. Add items has no tabs. Adding, editing, checking,
Luxembourgish suggestions, learned aisle corrections, and test-data export/import
all work. Two-device sync was deferred during this phase because the second phone
was not ready; physical checks were subsequently completed in the single-list
phase above. Automated list-sync tests pass.

## Complete tracked-file disposition

Every path tracked at the baseline is accounted for below, followed by added files.
“Update” includes comment/doc cleanup as well as implementation changes.

| Baseline path | Disposition | Purpose / reason |
| --- | --- | --- |
| .github/workflows/checks.yml | Update | Retained single locked-install/configuration/fuzz/typecheck/test workflow. |
| .github/workflows/nightly.yml | Remove | Removed legacy Apple/Android emulator and factory workflow. |
| .github/workflows/qa-e2e.yml | Remove | Removed legacy Apple/Android emulator and factory workflow. |
| .gitignore | Update | Retained Android application entry, configuration, locked dependencies, or local-file exclusions. |
| .nvmrc | Keep | Retained Android application entry, configuration, locked dependencies, or local-file exclusions. |
| AGENTS.md | Update | Maintained current-project documentation or required legal attribution. |
| ARCHITECTURE.md | Update | Maintained current-project documentation or required legal attribution. |
| App.tsx | Update | Retained Android application entry, configuration, locked dependencies, or local-file exclusions. |
| CREDITS.md | Update | Maintained current-project documentation or required legal attribution. |
| LICENSE | Keep | Retained Android application entry, configuration, locked dependencies, or local-file exclusions. |
| PRIVACY.md | Update | Maintained current-project documentation or required legal attribution. |
| README.md | Update | Maintained current-project documentation or required legal attribution. |
| StoreKitTips.storekit | Remove | Removed Apple purchase-testing configuration. |
| app.json | Update | Retained Android application entry, configuration, locked dependencies, or local-file exclusions. |
| assets/adaptive-icon.png | Keep | Retained launcher/splash source assets, bundled fonts, and font license. |
| assets/favicon.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| assets/fonts/IBMPlexMono-Medium.otf | Keep | Retained launcher/splash source assets, bundled fonts, and font license. |
| assets/fonts/IBMPlexMono-Regular.otf | Keep | Retained launcher/splash source assets, bundled fonts, and font license. |
| assets/fonts/IBMPlexSans-Medium.otf | Keep | Retained launcher/splash source assets, bundled fonts, and font license. |
| assets/fonts/IBMPlexSans-Regular.otf | Keep | Retained launcher/splash source assets, bundled fonts, and font license. |
| assets/fonts/IBMPlexSans-SemiBold.otf | Keep | Retained launcher/splash source assets, bundled fonts, and font license. |
| assets/fonts/LICENSE-IBM-Plex.md | Keep | Retained launcher/splash source assets, bundled fonts, and font license. |
| assets/icon.png | Keep | Retained launcher/splash source assets, bundled fonts, and font license. |
| assets/icon.svg | Remove | Superseded old cart artwork with the approved raster basket master. |
| assets/icon-source.png, assets/icon-foreground.png, assets/icon-generation.json | Add | Approved concept 17, transparent foreground for native layers, and generation/export provenance. |
| assets/play-icon.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| assets/splash-icon.png | Keep | Retained launcher/splash source assets, bundled fonts, and font license. |
| credits-config.json | Remove | Orphaned external-generator config; retained runtime credits and CREDITS.md maintained locally. |
| docs/development.md | Update | Maintained current-project documentation or required legal attribution. |
| docs/siri.md | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| eas.json | Keep | Retained Android application entry, configuration, locked dependencies, or local-file exclusions. |
| index.ts | Keep | Retained Android application entry, configuration, locked dependencies, or local-file exclusions. |
| landing/index.html | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| modules/grocery-siri/expo-module.config.json | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| modules/grocery-siri/index.ts | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| modules/grocery-siri/ios/GrocerySiri.podspec | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| modules/grocery-siri/ios/GrocerySiriModule.swift | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| modules/grocery-siri/package.json | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| package-lock.json | Update | Retained Android application entry, configuration, locked dependencies, or local-file exclusions. |
| package.json | Update | Retained Android application entry, configuration, locked dependencies, or local-file exclusions. |
| plugins/siri/AddGroceryItemIntent.swift | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| plugins/siri/GroceryAppShortcuts.swift | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| plugins/siri/SiriStore.swift | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| plugins/withAndroidLocaleConfig.js | Remove | Replaced by Expo Localization with Android en/lb declarations in the Luxembourgish feature. |
| plugins/withGradleJvmArgs.js | Keep | Retained Android Gradle JVM or locale configuration plugin. |
| plugins/withSiriIntents.js | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| qa/actions.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baseline.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/aosp-nogms-light-f1.0-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/aosp-nogms-light-f1.0-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/aosp-nogms-light-f1.0-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-dark-f1.0-landscape/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-dark-f1.0-landscape/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-dark-f1.0-landscape/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-dark-f1.0-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-dark-f1.0-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-dark-f1.0-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-dark-f1.3-landscape/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-dark-f1.3-landscape/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-dark-f1.3-landscape/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-dark-f1.3-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-dark-f1.3-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-dark-f1.3-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-light-f1.0-landscape/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-light-f1.0-landscape/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-light-f1.0-landscape/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-light-f1.0-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-light-f1.0-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-light-f1.0-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-light-f1.3-landscape/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-light-f1.3-landscape/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-light-f1.3-landscape/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-light-f1.3-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-light-f1.3-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/ipad-13-light-f1.3-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-dark-f1.0-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-dark-f1.0-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-dark-f1.0-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-dark-f1.3-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-dark-f1.3-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-dark-f1.3-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-light-f1.0-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-light-f1.0-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-light-f1.0-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-light-f1.3-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-light-f1.3-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-light-f1.3-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-se-dark-f1.0-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-se-dark-f1.0-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-se-dark-f1.0-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-se-dark-f1.3-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-se-dark-f1.3-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-se-dark-f1.3-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-se-light-f1.0-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-se-light-f1.0-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-se-light-f1.0-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-se-light-f1.3-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-se-light-f1.3-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/iphone-se-light-f1.3-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-phone-dark-f1.0-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-phone-dark-f1.0-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-phone-dark-f1.0-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-phone-dark-f1.3-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-phone-dark-f1.3-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-phone-dark-f1.3-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-phone-light-f1.0-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-phone-light-f1.0-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-phone-light-f1.0-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-phone-light-f1.3-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-phone-light-f1.3-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-phone-light-f1.3-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-dark-f1.0-landscape/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-dark-f1.0-landscape/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-dark-f1.0-landscape/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-dark-f1.0-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-dark-f1.0-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-dark-f1.0-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-dark-f1.3-landscape/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-dark-f1.3-landscape/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-dark-f1.3-landscape/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-dark-f1.3-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-dark-f1.3-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-dark-f1.3-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-light-f1.0-landscape/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-light-f1.0-landscape/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-light-f1.0-landscape/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-light-f1.0-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-light-f1.0-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-light-f1.0-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-light-f1.3-landscape/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-light-f1.3-landscape/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-light-f1.3-landscape/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-light-f1.3-portrait/autocomplete.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-light-f1.3-portrait/home.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/baselines/pixel-tablet-light-f1.3-portrait/list.png | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/critical-tests.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/defect-reporter.cjs | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/devices.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/draggableFlatListMock.cjs | Keep | Retained active test mocks, sync-fuzz support, or regression replay documentation. |
| qa/feature-graphic.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/demo-sync-a.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/demo-sync-b-open.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/demo-sync-b-verify.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/demo.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/01-android-open.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/02-ios-add.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/03-android-verify-add.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/04-ios-readd.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/05-android-verify-readd.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/06-ios-check-bananas.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/07-android-bump-bananas.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/08-android-verify-merge.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/09-ios-verify-merge.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/10-android-add-mango.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/11-ios-verify-backfill.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/12-ios-add-papaya.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/13-android-verify-stored.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/e2e-sync/chaos-honesty.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/extension.spec.ts.example | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/mobile.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/mobile.yaml.example | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/state-survival.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/state-survival.yaml.example | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/upgrade-assert.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/flows/upgrade-write.yaml | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/frame.html | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/intent-fuzz/README.md | Update | Retained active test mocks, sync-fuzz support, or regression replay documentation. |
| qa/intent-fuzz/harness.ts | Update | Retained active test mocks, sync-fuzz support, or regression replay documentation. |
| qa/intent-fuzz/harnessCore.cjs | Update | Retained active test mocks, sync-fuzz support, or regression replay documentation. |
| qa/intent-fuzz/models/list-sync.model.ts.template | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/intent-fuzz/models/list.model.ts.template | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/intent-fuzz/models/timer.model.ts.template | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/intent-fuzz/models/tracker.model.ts.template | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/intent-fuzz/replay.ts | Keep | Retained active test mocks, sync-fuzz support, or regression replay documentation. |
| qa/intent-fuzz/selftest.mjs | Update | Retained active test mocks, sync-fuzz support, or regression replay documentation. |
| qa/journey.baseline.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/journey.example.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/journey.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/EXCLUSIONS.md | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/README.md | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/canonical/App.tsx | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/canonical/app.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/canonical/package.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/canonical/qa/baseline.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/canonical/qa/journey.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/canonical/qa/screenshots.config.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/canonical/src/Bad.tsx | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/canonical/src/components/AnimatedSplash.tsx | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/canonical/src/components/DrilldownPane.tsx | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/canonical/src/shell/AppShell.tsx | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/canonical/src/storage/reviewPrompt.ts | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| qa/known-bad/canonical/src/store/db.ts | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/canonical/src/theme/colors.ts | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/flow-drift/qa/journey.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/flow-drift/qa/selectors.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/known-bad/registry.base.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/nativeInput.setup.cjs | Keep | Retained active test mocks, sync-fuzz support, or regression replay documentation. |
| qa/quarantine.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/quarantine.setup.cjs | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/regressions/README.md | Keep | Retained active test mocks, sync-fuzz support, or regression replay documentation. |
| qa/regressions/monkey-20260805.log | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/regressions/monkey-20260813.log | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/regressions/monkey-20260821.log | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/review-rubric.md | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/rules.example.mjs | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/screenshots.config.example.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/screenshots.config.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/selectors.example.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/selectors.json | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| qa/trust-core.test.example.ts | Remove | Removed legacy device captures, factory gates, templates, quarantine/reporting, or historical logs. |
| scratch/seed/assemble.mjs | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scratch/seed/raw/bakery.json | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scratch/seed/raw/beverages.json | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scratch/seed/raw/dairy-eggs.json | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scratch/seed/raw/frozen.json | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scratch/seed/raw/household.json | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scratch/seed/raw/meat-seafood.json | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scratch/seed/raw/pantry-baking.json | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scratch/seed/raw/pantry-cooking.json | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scratch/seed/raw/personal-care.json | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scratch/seed/raw/produce-fruits.json | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scratch/seed/raw/produce-veg.json | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scratch/seed/raw/snacks.json | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| scripts/build-icon.mjs | Update | Retained Android app asset generation or configuration guard; host OS support preserved. |
| scripts/e2e/chaos-relay.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/e2e/chaos-scenarios.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/e2e/e2e.config.sh | Remove | Removed orphaned factory/device/store automation. |
| scripts/e2e/harness-lib.sh | Remove | Removed orphaned factory/device/store automation. |
| scripts/e2e/mini-relay.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/e2e/run-chaos.sh | Remove | Removed orphaned factory/device/store automation. |
| scripts/e2e/run-two-device.sh | Remove | Removed orphaned factory/device/store automation. |
| scripts/lib/cng-prebuild-preflight.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/lib/find-chrome.mjs | Remove | No remaining consumer after icon export moved to Expo's installed image utilities. |
| scripts/lib/heavy.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/lib/npm-drift-preflight.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/lod/README.md | Update | Retained reviewed catalog provenance, deterministic generator, and review report. |
| scripts/lod/build.cjs | Keep | Retained reviewed catalog provenance, deterministic generator, and review report. |
| scripts/lod/manifest.json | Keep | Retained reviewed catalog provenance, deterministic generator, and review report. |
| scripts/lod/read.cjs | Keep | Retained reviewed catalog provenance, deterministic generator, and review report. |
| scripts/lod/review.md | Keep | Retained reviewed catalog provenance, deterministic generator, and review report. |
| scripts/lod/selection.cjs | Keep | Retained reviewed catalog provenance, deterministic generator, and review report. |
| scripts/lod/source.json | Keep | Retained reviewed catalog provenance, deterministic generator, and review report. |
| scripts/qa-canonical.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/action-coverage.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/app-dir.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/capture.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/compile-flow.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/heal.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/lint-flows.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/matrix-review.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/matrix.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/prove-gates.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/recomposite-tablet.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/run-qa.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/run-survival.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/source-hash.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/triage.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/upgrade-test.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/qa/visual-reg.mjs | Remove | Removed orphaned factory/device/store automation. |
| scripts/render-screenshots.mjs | Remove | Removed orphaned factory/device/store automation. |
| src/components/AboutRow.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/AddAction.tsx | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/AddIngredientsSheet.tsx | Remove | Retired kit feature and its dedicated tests; list behavior retained. |
| src/components/AddItemsSheet.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/AnimatedSplash.tsx | Remove | Removed the custom branded splash and timed animation; Android launch screen hands off directly to ready content. |
| src/components/Credits.tsx | Remove | Removed in-app acknowledgements; repository CREDITS.md and licenses retained. |
| src/components/Dialogs.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/EmptyState.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/ErrorBoundary.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/FundingFooter.tsx | Remove | Replaced by FeedbackFooter; removed donation action, retained feedback and animation. |
| src/components/ItemEditor.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/ItemPicker.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/KitPicker.tsx | Remove | Retired kit feature and its dedicated tests; list behavior retained. |
| src/components/LanguageSetting.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/LaunchNoticeModal.tsx | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/components/MoreFromJA.tsx | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/components/ReviewModal.tsx | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/components/ScreenHeader.tsx | Remove | Unused generic header and its isolated test; current screens render their own headers. |
| src/components/SettingsAbout.tsx | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/components/SiriSetting.tsx | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| src/components/Snackbar.tsx | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/Stepper.tsx | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/SwipeRow.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/SyncStatusBar.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/TipJarSheet.tsx | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/components/Wordmark.tsx | Remove | Removed feedback/footer/navigation UI or its unused support code. |
| src/components/__tests__/AboutRow.component.test.tsx | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/__tests__/Credits.component.test.tsx | Remove | Removed in-app acknowledgements; repository CREDITS.md and licenses retained. |
| src/components/__tests__/Dialogs.component.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/__tests__/FundingFooter.component.test.tsx | Remove | Replaced by FeedbackFooter; removed donation action, retained feedback and animation. |
| src/components/__tests__/ItemEditor.component.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/__tests__/ItemPicker.clearOnAdd.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/__tests__/ItemPicker.component.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/__tests__/LanguageSetting.component.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/__tests__/MoreFromJA.component.test.tsx | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/components/__tests__/ReviewModal.component.test.tsx | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/components/__tests__/ReviewModal.linkSafety.test.tsx | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/components/__tests__/ScreenHeader.component.test.tsx | Remove | Unused generic header and its isolated test; current screens render their own headers. |
| src/components/__tests__/SettingsAbout.component.test.tsx | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/components/__tests__/Stepper.component.test.tsx | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/__tests__/TipJarSheet.component.test.tsx | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/components/dialogShared.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/jaCatalog.ts | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/components/tipJarStyles.ts | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/components/usePullRevealFooter.ts | Remove | Removed feedback/footer/navigation UI or its unused support code. |
| src/constants/tipProducts.ts | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/data/__tests__/aisleOrder.test.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/__tests__/categories.test.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/__tests__/seedCatalog.test.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/aisleOrder.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/aislePreferences.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/catalog.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/categories.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/categoryKeywords.ts | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| src/data/credits.ts | Remove | Removed in-app acknowledgements; repository CREDITS.md and licenses retained. |
| src/data/kit.ts | Remove | Retired kit feature and its dedicated tests; list behavior retained. |
| src/data/list.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/seedCatalog.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/seedCatalogData.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/feedback/FeedbackLogPreview.tsx | Remove | Removed unused email-report UI/composition; GitHub action and local diagnostics remain. |
| src/feedback/FeedbackProvider.tsx | Remove | Removed feedback/footer/navigation UI or its unused support code. |
| src/feedback/FeedbackSheet.tsx | Remove | Removed unused email-report UI/composition; GitHub action and local diagnostics remain. |
| src/feedback/FeedbackTypePicker.tsx | Remove | Removed unused email-report UI/composition; GitHub action and local diagnostics remain. |
| src/feedback/__tests__/feedback.test.ts | Update | Retained bounded local diagnostics, privacy tests, and GitHub issue action; no upload. |
| src/feedback/compose.ts | Remove | Removed unused email-report UI/composition; GitHub action and local diagnostics remain. |
| src/feedback/diagnostics.ts | Update | Retained bounded local diagnostics, privacy tests, and GitHub issue action; no upload. |
| src/feedback/feedbackSheetStyles.ts | Remove | Removed unused email-report UI/composition; GitHub action and local diagnostics remain. |
| src/feedback/fileStore.ts | Update | Retained bounded local diagnostics, privacy tests, and GitHub issue action; no upload. |
| src/feedback/log.ts | Update | Retained bounded local diagnostics, privacy tests, and GitHub issue action; no upload. |
| src/i18n/__tests__/keyParity.test.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/__tests__/localeSwitching.test.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/__tests__/voiceControlNames.test.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/appStrings.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/de.ts | Remove | Retired interface translation; retain English and translation infrastructure. |
| src/i18n/es.ts | Remove | Retired interface translation; retain English and translation infrastructure. |
| src/i18n/fr.ts | Remove | Retired interface translation; retain English and translation infrastructure. |
| src/i18n/index.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/it.ts | Remove | Retired interface translation; retain English and translation infrastructure. |
| src/i18n/ja.ts | Remove | Retired interface translation; retain English and translation infrastructure. |
| src/i18n/localePreference.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/locales.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/pt-BR.ts | Remove | Retired interface translation; retain English and translation infrastructure. |
| src/i18n/shellLocales.ts | Remove | Retired interface translation; retain English and translation infrastructure. |
| src/i18n/shellStrings.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/lib/__tests__/aisleTransfer.test.ts | Remove | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/lib/backup.ts | Remove | Unused generic legacy backup helper; active transfer.ts export/import remains. |
| src/lib/id.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/lib/links.ts | Remove | Removed feedback/footer/navigation UI or its unused support code. |
| src/lib/tipJar.ts | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/lib/transfer.ts | Remove | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/qa/__tests__/edgeInset.proof.test.tsx | Update | Retained test-only layout audit; Android representative dimensions and retained screens. |
| src/qa/__tests__/edgeInset.screens.test.tsx | Update | Retained test-only layout audit; Android representative dimensions and retained screens. |
| src/qa/edgeInset.ts | Update | Retained test-only layout audit; Android representative dimensions and retained screens. |
| src/qa/edgeInsetAudit.tsx | Update | Retained test-only layout audit; Android representative dimensions and retained screens. |
| src/qa/fixtures.example.ts | Remove | Removed production demo/capture mode and unused example fixture. |
| src/qa/fixtures.ts | Remove | List sample moved to test-only support; runtime seeding and demo secret removed. |
| src/qa/qaMode.ts | Remove | Removed production demo/capture mode and unused example fixture. |
| src/screens/KitDetailScreen.tsx | Remove | Retired kit feature and its dedicated tests; list behavior retained. |
| src/screens/KitsHomeScreen.tsx | Remove | Retired kit feature and its dedicated tests; list behavior retained. |
| src/screens/ListDetailScreen.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/ListsHomeScreen.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/ReorderAislesScreen.tsx | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/SettingsScreen.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/ShareScreen.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/__tests__/KitDetailScreen.screen.test.tsx | Remove | Retired kit feature and its dedicated tests; list behavior retained. |
| src/screens/__tests__/KitsHomeScreen.screen.test.tsx | Remove | Retired kit feature and its dedicated tests; list behavior retained. |
| src/screens/__tests__/ReorderAislesScreen.screen.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/__tests__/SettingsScreen.screen.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/__tests__/ShareScreen.screen.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/navTypes.ts | Remove | Removed feedback/footer/navigation UI or its unused support code. |
| src/shell/AppShell.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/shell/navTheme.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/siri/__tests__/drain.test.ts | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| src/siri/defaultList.ts | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| src/siri/drain.ts | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| src/siri/index.ts | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| src/siri/native.ts | Remove | Removed native voice assistant integration and its hooks, UI, docs, and tests. |
| src/storage/__tests__/launchNotice.test.ts | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/storage/__tests__/reviewPrompt.test.ts | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/storage/dbConfig.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/storage/kv.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/storage/launchNotice.ts | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/storage/reviewPrompt.ts | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/store/__tests__/aisleLearning.test.ts | Keep | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/store/__tests__/aislePersistence.test.ts | Keep | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/store/__tests__/dbInit.test.ts | Keep | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/store/__tests__/historyRank.test.ts | Keep | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/store/__tests__/kits.test.ts | Remove | Retired kit feature and its dedicated tests; list behavior retained. |
| src/store/account.ts | Update | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/store/db.ts | Update | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/store/historyRank.ts | Keep | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/store/kits.ts | Remove | Retired kit feature and its dedicated tests; list behavior retained. |
| src/store/lists.ts | Update | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/sync/__tests__/clock.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/crypto.test.ts | Update | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/engine.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/engineDefaultTransport.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/intentFuzz.model.test.ts | Update | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/intentFuzz.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/mergeDupNames.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/mergeKits.test.ts | Remove | Retired kit feature and its dedicated tests; list behavior retained. |
| src/sync/__tests__/mergeRecordSet.test.ts | Update | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/publishRejectionStatus.test.tsx | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/reportedDefects.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/share.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/skewMerge.test.ts | Update | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/status.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/storeAndForward.test.tsx | Update | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/syncSim.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/clock.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/crypto.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/index.ts | Update | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/merge.ts | Update | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/mergeKits.ts | Remove | Retired kit feature and its dedicated tests; list behavior retained. |
| src/sync/mergeRecordSet.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/share.ts | Update | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/shareConfig.ts | Update | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/simHarness.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/status.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/transport.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/theme/AppearanceToggle.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/theme/__tests__/contrast.test.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/theme/__tests__/typography.test.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/theme/appAccent.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/theme/categoryPalette.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/theme/colors.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/theme/index.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/theme/layout.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/theme/themePreference.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/theme/tokens.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/theme/typography.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/theme/useAppFonts.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/types/noble.d.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| store-assets/demos/add-check-share.gif | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/demos/add-check-share.mp4 | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/demos/add-items.gif | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/demos/add-items.mp4 | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/demos/hero.frame.json | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/demos/hero.gif | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/demos/sync-two-devices.frame.json | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/demos/sync-two-devices.gif | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/demos/sync-two-devices.mp4 | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/play-content-rating.json | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/play-data-safety.csv | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/android/01-android-phone-core.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/android/02-android-phone-josh-approved.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/android/03-android-phone-share.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/android/04-android-phone-autocomplete.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/android/05-android-phone-home.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/android/feature-graphic/.provenance.json | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/android/feature-graphic/android.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/android/icon/icon.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/ios/01-iphone-6.9in-core.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/ios/02-iphone-6.9in-josh-approved.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/ios/03-iphone-6.9in-share.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/ios/04-iphone-6.9in-autocomplete.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/ios/05-iphone-6.9in-home.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/ipad/01-ipad-13in-core.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/ipad/02-ipad-13in-josh-approved.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| store-assets/screenshots/ipad/03-ipad-13in-autocomplete.png | Remove | Removed upstream web/store marketing material; no supported web/store target. |
| stryker.config.json | Remove | Removed unused mutation-testing infrastructure under lean-checks decision. |
| tsconfig.json | Update | Retained Android application entry, configuration, locked dependencies, or local-file exclusions. |

### Added files

| Path | Purpose |
| --- | --- |
| babel.config.js | Explicit Expo Babel transform for Metro and Android Jest. |
| docs/repository-audit.md | This complete audit and acceptance record. |
| scripts/check-android.cjs | Retained Android app asset generation or configuration guard; host OS support preserved. |
| src/components/FeedbackFooter.tsx | Added in the first cleanup, then removed with the feedback footer. |
| src/components/__tests__/FeedbackFooter.component.test.tsx | Added in the first cleanup, then removed with the feedback footer. |
| src/sync/__tests__/support/listFixture.ts | Test-only list fixture, no production import or build-time share secret. |
| src/screens/__tests__/ListsHomeScreen.screen.test.tsx | Localized delete-confirmation regression tests for all supported interface languages. |

### Files added by the simplification

| Path | Purpose |
| --- | --- |
| src/lib/version.ts | Runtime app/build version retained independently of removed links. |
| src/screens/__tests__/App.navigation.test.tsx | Real stack navigation and share-link regression checks. |
| src/store/__tests__/kitRemoval.test.ts | Real SQLite retirement migration and preservation checks. |
| src/i18n/__tests__/localePreference.test.ts | Saved-language fallback and persistence regression checks. |
