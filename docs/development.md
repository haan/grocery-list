# Android development

## Project identity

- Repository: https://github.com/haan/grocery-list (independent, not an upstream fork network member).
- Expo owner: `lean-mean-coding-team`; slug: `grocery-list`.
- Expo project: `80882728-1f01-40c5-b4aa-56fcfa53f928`.
- Variant configuration: `app.config.js` overlays the shared `app.json` base.
- Default local variant: `development`; EAS profiles set `APP_VARIANT` explicitly.
- Expo SDK 57; Node 26.12.1; npm 11.20.0; EAS CLI 27.5.0.

| | Development | Everyday |
|---|---|---|
| App name | Grocery List Dev | Grocery List |
| Android package | io.github.haan.grocerylist.dev | io.github.haan.grocerylist |
| Invitation scheme | haan-grocerylist-dev | haan-grocerylist |
| Adaptive icon / native launch background | Purple | Teal |
| EAS profile / channel | development | production |
| Use | Metro, disposable test lists | Standalone APK, household shopping |

Both apps can stay installed on the Pixel with independent storage and language
settings. The second household phone only needs Grocery List. For sync testing,
install Dev there as well and pair the Dev apps on a separate disposable list.
The existing Dev package and signing credential are preserved; no data is copied
or reset by this variant change. The everyday package starts empty and private.
Invitation parsing uses the installed binary's application ID and rejects the
other variant's QR/link. Nostr payloads and merge rules are unchanged. Already
paired Dev installations continue syncing; this is an invitation safeguard, not
a separate relay service or a migration of existing shared lists.
Share links contain the list's secret: do not put real share links in logs, issues,
screenshots, or source control. Use disposable lists while developing.

## First installation

Startup uses only Android's native launch screen while fonts and local data load.
The app shell hides it as soon as the content (or the startup error/retry screen)
has laid out. There is no custom branded splash or artificial animation delay.
Removing the former animation works through Metro. Launcher icon and native
launch artwork changes require a new APK.

The approved icon is concept 17: a coral grocery basket on teal. Its original
artwork is `assets/icon-source.png`, with an image-generated transparent cutout
in `assets/icon-foreground.png`. `assets/icon-generation.json` records the prompts
and export settings. Run `node scripts/build-icon.mjs` to regenerate the three
1024px PNG exports using Expo's installed image utilities; no browser, AI request,
or extra dependency is needed. The adaptive foreground is padded for Android's
icon masks, over teal `#05515F` (everyday) or purple `#5B3A80` (Dev); the native launch screen uses the variant's background
and a 180dp transparent image. This does not reintroduce the custom splash.
Exploration variants remain ignored in `tmp/icon-concepts/`.

From PowerShell in `E:\codex\grocery-list`:

```powershell
npm ci
npx eas-cli@27.5.0 login
npx eas-cli@27.5.0 project:info
npm run build:dev
```

Complete the Expo sign-in when prompted. The app is already linked; do not run
`create-expo-app` or initialize a different project. EAS builds the APK remotely.
Choose an Expo-managed Android keystore when setting up credentials for the first
build. Keep that keystore for future builds of this package.

Open the completed EAS build's installation link on your Pixel 8. Download the
APK and permit installation from the browser when Android asks. This is our own
development client, not Expo Go. No Play Store publishing account is needed.

## Everyday edit and debug loop

```powershell
npm run dev
```

Keep this terminal running. Put the phone and PC on the same trusted Wi-Fi.
Scan the terminal QR code with the phone's camera, or open Grocery List Dev and
select the running development server. Save a TypeScript/UI edit and Fast Refresh
updates the phone. Reload manually if a change affects startup code.

Press `j` in Metro's terminal to open React Native DevTools once the app connects.
Use Sources to set breakpoints (for example in `src/screens/ListsHomeScreen.tsx`)
and trigger the corresponding interaction on the phone. Use the Console for
JavaScript logs; use Android logcat for native crashes when Android tools are
available. Phone developer options/USB debugging are not needed for the Wi-Fi path.

If `Cannot connect to Expo CLI` appears after a connection interruption, keep
Metro running and press `r` in its terminal to reload and reconnect. If the phone
says `Paused in debugger`, use Resume (F8) in DevTools first. The warning's USB
instructions are an alternative connection method, not a requirement for Wi-Fi.

If Android reports `Failed to download remote update`, checking `/status` alone
is insufficient: Metro can be reachable while Expo's startup manifest fails.
Check `http://10.1.0.20:8081/` with the `expo-platform: android` header and then
the returned `launchAsset.url`; both must return HTTP 200.

In a restricted agent environment, blocked Expo API requests can make that
manifest return `ECONNREFUSED 127.0.0.1:9`. Stop the server and use:

```powershell
npx expo start --dev-client --offline
```

Do not append `--offline` to `npm run dev`: its explicit `--lan` conflicts with
that flag in this CLI version. Offline mode defaults to LAN and skips the CLI's
online requests; it does not disable the phone app's Nostr synchronization.
If the manifest instead returns `spawn EPERM`, run the server in a normal
PowerShell terminal or an approved execution context outside the agent sandbox
so Expo can launch its local helpers. No app rebuild or reinstall is required.

For Wi-Fi connection problems, check that neither device uses guest Wi-Fi/client
isolation or a VPN that prevents LAN access. If Windows asks, allow Node on your
trusted private network. Do not disable the firewall globally. A tunnel fallback:

```powershell
npm run dev:tunnel
```

Expo may ask to install its tunnel helper. Tunnels require internet connectivity
and depend on the tunnel provider. A USB alternative, if Android platform-tools
are installed and USB debugging is enabled/authorized on the phone, is
`adb reverse tcp:8081 tcp:8081`, then use Metro at localhost:8081.

## When another build is needed

JavaScript, styles, and most app logic use Fast Refresh; no EAS Update publication
or cloud build is involved. Native dependencies, config plugins, native Android
permissions, or SDK upgrades require `npm run build:dev` again.

## Everyday APK releases

```powershell
npm run build:production
```

This creates a signed standalone APK with JavaScript bundled inside it. Install
that APK on both household phones, then share a new list between those apps.
It starts without Metro or a PC; local shopping works offline, and Nostr sync
resumes when connectivity returns. Production is an internal APK distribution
profile, not a Play Store submission. There is no third preview variant.

Develop on a feature branch with Dev and Metro. After checks and review, build a
new production APK from the desired source revision. Install it as an update
without uninstalling or clearing storage. EAS increments Android versionCode and
keeps credentials per package. The first production build provisions its own
keystore; keep that key for all future everyday releases. Never commit keys.
Merging source code alone does not update installed everyday apps.

Both profiles use the existing Expo project, separate update channels, and
fingerprint runtime compatibility. JavaScript/assets can now be delivered through
Expo Updates as described below. Native changes still require a new APK; GitHub
APK detection and installation remain deferred.

Generated `android/` is ignored and excluded from EAS uploads, so cloud builds
regenerate it for the selected profile. For a local native build after switching
variants, regenerate with `npx expo prebuild --platform android --clean` before
`npx expo run:android`; do not reuse another variant's generated native project.
Set `$env:APP_VARIANT='production'` only for local production inspection, then
remove it (`Remove-Item Env:APP_VARIANT`) before returning to Metro development.

## Expo updates for the everyday app

The installed production APK automatically checks/downloads compatible updates at
startup, without delaying access to the cached app. A downloaded update applies
on the next cold start. Settings → Updates can check/download on demand or restart
when an update is ready. Restart is explicit, saves the current list first, and is
blocked during a sharing transition or a failed list write. Dev shows a Metro
explanation and never invokes production update APIs.

The native APK version stays unchanged after an OTA update. Settings displays the
short update ID for downloaded releases so we can verify which code is running.
A failed/offline update check leaves the installed app usable. An update check
only finds compatible JS/assets, not newer APKs.

Production Expo environment has plaintext `APP_VARIANT=production`. Build-profile
`env` values alone do not configure an EAS Update invocation. Use the wrapper:

```powershell
npm exec --package=eas-cli@27.5.0 -- node scripts/update-production.cjs --build 9b8210ac-c3d5-4c33-9966-dd09bada49ea --message "Describe the tested change"
```

Replace the build ID when targeting a later everyday APK. This command verifies
that the selected build is a finished production APK and that the current native
fingerprint exactly matches its runtime, then publishes Android only to the
production channel/environment. A mismatch stops publication; never override the
runtime hash to force delivery. A dry run (put `--dry-run` before `--build`)
prints the intended target without a network request or compatibility check.
Run TypeScript, tests and Android checks before deliberate publication. No push,
merge or scheduled job publishes an update automatically.

The original production APK's fingerprint is
`c1cfabf69b96d9c0b35bb5bdeaa31b6c070c623b`. Expo's fingerprint includes npm
scripts and the presence of an ignored generated Android directory. Consequently
we keep this command in its own script rather than adding a package.json script.
The fingerprint also hashes `eas.json` bytes; `.gitattributes` pins that file to
LF so Windows checkouts do not change the runtime solely through line endings.
For a fresh checkout targeting that APK, generate the ignored Android directory
with `npx expo prebuild --platform android --no-install` first. Its native
contents remain ignored; the wrapper compares the actual fingerprint before
publishing. Use `eas fingerprint:compare --build-id BUILD_ID --environment production`
to investigate mismatches. A future native rebuild can establish a new runtime;
never weaken native compatibility to avoid a rebuild.

On the phone, open the everyday app online, allow the background download, then
fully close/reopen it. The first release adds the Updates section itself; later
releases can use its Check/Restart controls. Check local data and language survive,
and verify the update ID. A second everyday phone receives the same production
update independently. Keep test sharing separate from household data.

For a bad release, use Expo's update rollback/republish controls for the production
channel and affected runtime. Keep the prior update group ID in release records.
Rollback to embedded code is also supported by the UI. Rollback changes code;
it does not reverse database migrations, so migrations must remain compatible.

## Checks and CI

```powershell
npm run check:android
npm run test:fuzz-harness
npm run typecheck
npm test -- --runInBand
npx expo install --check
npx expo-doctor@latest
```

The Checks workflow runs Android-only configuration checks, fuzz-harness self-tests, TypeScript, and the Jest Android suite on main pushes and pull requests. It can also be run manually. There are no scheduled builds or device-emulator jobs. Fuzz artifacts go to ignored tmp/; useful minimized regression JSON stays tracked under qa/regressions.

## Item-details workflow

Add items opens an alphabetical browser of the entire catalog and personal
Recent names, grouped under letter headings. The keyboard starts hidden for
browsing. “Search items” filters names and confirmed aliases, including accent-free
input; there is no result cap. Custom Recent names retain their edit/forget/Undo
controls. Recognized catalog names and aliases never show a pencil, including
after use; their history is still recorded. Matching ignores case, accents,
Unicode representation and repeated whitespace. Longer custom names remain editable.
Frequency no longer changes their position in the alphabetical list.
The custom suggestion pencil opens Edit suggestion directly as a bottom sheet, with the name
initially selected, a scope explanation, and Cancel/Save actions. Its header trash
action is labeled Forget suggestion and retains Undo. Forget discards unsaved
name changes; neither renaming nor forgetting changes existing shopping items.
The browser starts with a screenful of rows, then queues small batches during idle
time regardless of scrolling or screen visibility. A short preparation footer marks
the end of the available rows until the queue finishes; there are no blank placeholders.
The full view stays mounted between visits, including behind filtered results, so
later openings reuse it. Closing early does not stop preparation. Fast scrolling
after preparation never requests more rows. Search always checks the full catalog,
even before its rows are drawn. This cache lasts for the current home/list instance,
not across restarting the app. Sorting
and alias normalization are prepared once, personal entries are merged when
Recent changes, and a bounded search cache avoids repeated preparation. Moving
the letter bubble updates its animated position without rerendering the list.
The hidden layer ignores touches and accessibility navigation. When it is visible,
home controls are hidden from accessibility, Android Back closes the browser, and
closing resets search/scroll and cancels pending keyboard focus without deleting
the prepared rows. Details dialogs retain their native-modal Back/cancel behavior.

Tapping a suggestion opens the shared details sheet. A nonempty search without
an exact name or confirmed-alias match offers Add “…” alongside any partial
matches; keyboard Enter follows that same condition. Exact matching ignores case,
accents, and repeated whitespace and includes Recent names. Otherwise
Enter dismisses the keyboard. The close icon leaves Add items. While scrolling,
a small letter bubble follows the scrollbar position, reflects the first visible
group, and fades after scrolling stops (instant transitions with reduced motion).
Quantity is a separate whole-number field (1–99) with +/- controls. The app does
not parse quantities from phrases such as “sechs Plastiktuten”.
Opening a new item draft capitalizes the first character of its prefilled name
(for example, “glace” becomes “Glace”); existing items retain their stored names.
The compact form orders fields as name, quantity, aisle, and note. The aisle row
opens a vertical chooser with the current aisle marked; selecting an aisle returns
to the form, while Cancel, scrim tap, or Android Back returns without changing it.
The note field has no example placeholder and starts one line tall, expanding
with content up to 160 logical pixels before scrolling internally. The form's
Cancel and Add/Save actions stay outside the scrolling fields above the keyboard.

The sheet holds an in-memory draft until Add item or Save. Cancel, scrim tap,
and Android Back discard edits. Aisles are created only in Settings → Manage
aisles; the item form selects from existing aisles. An unchecked
existing item opens its current details and quantity is the desired total.
Selecting a checked item prepares quantity 1, retains its note, and applies
learned aisles; confirmation unchecks it. Editing from home preserves check state.
Remove is a labeled trash icon in the form header; it discards unsaved edits and
Undo restores the original item. Cancel and Save remain the bottom actions. After a successful
save from Add items, search clears and regains focus with a short confirmation.

Manage aisles uses compact bottom sheets for Add aisle and Rename aisle, with a
labeled name field and equal-width Cancel and Add/Save actions above the keyboard.
Rename retains one-time initial selection without reselecting typed characters.
Confirmations remain centered dialogs, with readable body text and equal-width
outlined Cancel and primary action buttons. Destructive actions use a solid red
button with a light label in both themes. Longer messages can scroll while the
actions stay visible. Outside-tap and Android Back still cancel.

Sharing groups connection status and last peer contact in a compact panel with
one refresh icon (accessible as Sync now). The invitation section contains the
QR code, Send link, and access warning. Join another list contains the outlined
scanner action; Stop sharing is a separate red action at the bottom. A pending
join shows the waiting message and refresh controls without an invitation. These
layout changes preserve the existing sharing identity and confirmation flow.

`src/data/itemDraft.ts` holds the draft model and applies edits to the latest
list snapshot. `saveItemDraft` commits details and explicit aisle
learning in one Zustand list update and one persistence call. Only additions and
re-additions record Recent usage. Automatic aisle suggestions do not teach rules.
Untouched fields and the separate checked-state clock survive incoming edits.
Name collisions, deleted items, and unavailable aisles keep the form open with
an explanation. Replacing the current list closes its drafts. Existing item
records, SQLite schema, and encrypted Nostr payloads are unchanged.

This feature runs through Metro on the existing APK. No dependency installation,
native rebuild, data reset, or re-pairing is needed. Device acceptance for this
phase is separate from the earlier checks below:

- [x] Pixel: Plastiktut → quantity 6, note, aisle → Add item; one complete item
      and cleared/focused search. Confirmed by the user on 2026-11-06.
- [x] Pixel: keyboard, scrolling, and reachable form controls; suggestion → Cancel,
      existing-item Save/Cancel, and New aisle → Cancel preserve search/data as
      expected. Confirmed by the user on 2026-11-06.
- [ ] Pixel: custom-name cancellation, outside tap, Android Back, and visible
      success confirmation (not separately confirmed in the walkthrough).
- [ ] Pixel: existing total quantity, checked-item re-addition,
      Remove/Undo, and separate Recent edit/forget/Undo.
- [ ] Second phone: complete details arrive after Save, nothing arrives before
      confirmation, and re-adding the corrected product uses its learned aisle.
- [x] Alphabetical-browser follow-up: browse letter groups, verify the letter
      bubble updates and disappears after scrolling, filter suggestions, and
      verify Add appears only for no matches. User confirmed on 2026-11-06.
- [x] Loading follow-up: fully rendering the catalog removed growing/blank rows,
      but the user reported roughly two seconds to open it on 2026-11-06.
- [x] Retained-browser follow-up: repeated openings, Android Back, and home
      controls work. User confirmed on 2026-11-06; the first opening remains
      noticeably slower, so cold-start preparation is not considered instant.
- [x] Queued-browser follow-up: faster first screenful after restarting the app,
      complete list ready for fast scrolling after closing/waiting/reopening,
      and immediate “Zopp” search during preparation. User confirmed on the Pixel
      on 2026-11-06. Filter clearing preserves prepared rows in automated coverage.

Leave these unchecked until observed. Automated coverage includes the complete
custom-item flow, validation, cancellation, conflicts, remote edits, and compatible
snapshot convergence; it does not replace physical keyboard/layout verification.

## Android-only cleanup acceptance

The initial Android cleanup removed native purchase and email integrations and required a development APK update. Keep the package and signing key; do not uninstall or clear storage.

The earlier kit-removal phase did not need a native rebuild. The current single-list phase removes native file-transfer modules and does require a new development APK. Its one-time shopping reset supersedes the earlier preservation-only migration.

For this single-list upgrade, first launch deliberately resets all old shopping
data once. Check the empty private home screen; add an item, restart, and verify
that subsequent launches retain it. Check Settings (appearance, System/English,
Sharing, Manage aisles, version), add/edit/check/Undo/Clear, suggestions and learned
aliases, Recent edit/forget/Undo, drag ordering, and all three rename-selection
behaviors. No favorites, overview, list naming, kits, or import/export remain.
Opening Sharing must leave the list private. Start sharing, cancel Stop sharing,
then confirm Stop sharing and start again: the QR/link must change while items
remain. Check link/scan replacement confirmation, Android back navigation, and
pending-join messaging. Two-device additions, quantity/check changes, shared aisle
learning, and offline/reconnect convergence have been confirmed on physical phones.
Install the rebuilt APK as an update, without
uninstalling or clearing storage, to verify the native dependency removals.

Build and device results are recorded in [repository audit](repository-audit.md).

## Luxembourgish feature — November 2026

`feature/luxembourgish` adds the complete interface translation and natural
shopping labels. Settings → Language now offers System, English and Lëtzebuergesch.
Explicit selections are local to each phone and override Android's preference;
System follows Android's first supported language, with English fallback. Foreground
changes refresh the interface only if its effective language changes. The native
localization module and corrected Android language declaration require a new APK.

This pre-release upgrade intentionally clears test shopping data once, using the
`luxembourgish-shopping-v1` database marker. Items, Recent, custom aisles/order,
learned assignments, pending joins and sharing identity are reset together before
hydration and sync. Appearance/language survive. Later launches and wording updates
do not reset data. Update both test phones and pair them again; old relay data is
not deleted and is isolated by the new private-list identity.

Language quality resources:

- [English/Luxembourgish screen review](luxembourgish-review.md)
- [Catalog before/after review](../scripts/lod/review.md)
- [Spelling results](luxembourgish-spelling.md) and [Docker instructions/glossary](../scripts/language/README.md)

Feature acceptance (leave unchecked until observed on the rebuilt APK):

- [x] First update starts empty/private; add an item and restart to verify no second reset.
- [x] Choose Lëtzebuergesch and restart; the language selection persists.
- [ ] Return to English and test System on the phone.
- [ ] Review home, Add items, item forms, Recent edit/forget/Undo, aisle add/rename/delete,
      language picker, sharing/private/connected/scanning/join confirmations and errors.
- [ ] Check long text, large fonts, light/dark mode and action buttons above the keyboard.
- [ ] Search Banann/Banannen, Apel/appel, Ee/Eeër, Kartoffeln and Milch; check natural labels.
- [ ] Change quantity without changing the product label; verify learned aisle assignment.
- [ ] On two updated, newly paired phones use English on one and Luxembourgish on the other;
      verify item details, aisle learning, and offline/reconnect convergence.

Pixel confirmation (2026-11-07), APK 1.0.12 (6), build
`3d0aa2e9-da74-4608-ae22-86b7df6a5f71`: the user confirmed the empty/private
Luxembourgish startup and persistence of both a new item and the language choice
after restart. The list looks good on initial inspection; wording can be refined
over time. This initial review does not mark every detailed layout, search,
accessibility, or two-phone scenario above as completed.

## Credentials

Expo account credentials and tokens stay outside the repository. To inspect or
download the Android keystore, run `npx eas-cli@27.5.0 credentials --platform android`
and choose the appropriate build profile. Save the keystore and its passwords in
a secure backup outside this checkout. Do not commit `credentials.json`, keys, or
tokens. GitHub unit-test CI needs no Expo token; EAS builds use your local Expo login.

## Device acceptance (requires the phone)

- [x] Install the independent development APK on Pixel 8 / Android 17.
- [x] Connect to Metro and open the lists screen.
- [x] See a saved UI edit via Fast Refresh without reinstalling.
- [x] Inspect logs, stop at a JavaScript breakpoint, and resume in React Native DevTools.
- [x] Create a disposable list, restart, and confirm persistence.
- [x] While the app is loaded, disconnect networking and verify local edits;
      reconnect and confirm relay connectivity recovers.
- [ ] Open a development share link and confirm it opens this app.
- [x] With a second installation, verify bidirectional additions, quantity edits,
      check-offs, and learned aisle assignments.
- [x] Make independent edits while one phone is offline; reconnect and verify
      convergence without losing changes, including after reopening both apps.
- [ ] Verify cross-device item deletion on disposable data.

Installation, app loading, Fast Refresh, and persistence were confirmed on 2026-11-06.
Metro identified the connected device as Pixel 8 / Android 17 (API 37).
The temporary `LIVE` heading used for the refresh check was removed afterward.
The normal DevTools launcher (`j` in Metro) was verified with a temporary
breakpoint and console message. A Fast Refresh connection warning cleared after
reloading; another live edit then reached the phone and logged successfully.
All temporary breakpoint and logging code was removed afterward.
First successful development build:
https://expo.dev/accounts/lean-mean-coding-team/projects/grocery-list/builds/7363f767-ef0a-47d2-a3a8-532e2b4889b8

A development build may need Metro to cold-start. Use the standalone production
APK for a complete offline cold-start test. Automated checks cannot substitute
for these device checks; leave items unchecked until actually observed.
