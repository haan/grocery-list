# Android development

## Project identity

- Repository: https://github.com/haan/grocery-list (independent, not an upstream fork network member).
- Expo owner: `lean-mean-coding-team`; slug: `grocery-list`.
- Expo project: `80882728-1f01-40c5-b4aa-56fcfa53f928`.
- Display name: `Grocery List Dev`.
- Android package: `io.github.haan.grocerylist.dev`.
- Share links: `haan-grocerylist-dev://join?s=...`.
- Expo SDK 57; Node 26.12.1; npm 11.20.0; EAS CLI 27.5.0.

The original app can stay installed. Android gives this package separate storage.
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
icon masks, over `#05515F`; the native launch screen uses that same background
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

The `development` profile uses the `development` update channel. The `preview`
profile builds a standalone APK on the separate `preview` channel:

```powershell
npm run build:preview
```

Preview and development currently share the development package ID: installing
one replaces the other and retains its data if signed with the same key. Neither
replaces the original author's app. A future everyday release needs its own
package ID, scheme, release channel, and migration decisions before distribution.
No production or store-submission profile is configured.

Updates point only to our Expo project. Runtime compatibility uses Expo's
fingerprint policy. Actual OTA publishing and automatic APK updates are later work.

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
input; there is no result cap. Recent names retain their edit/forget/Undo controls,
but frequency no longer changes their position in the alphabetical list.
The Recent pencil opens Edit suggestion directly as a bottom sheet, with the name
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

A development build may need Metro to cold-start. Use the standalone preview
APK for a complete offline cold-start test. Automated checks cannot substitute
for these device checks; leave items unchecked until actually observed.
