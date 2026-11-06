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
