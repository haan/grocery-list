# Android-only repository audit

Baseline: main commit 5edb48bd2bff1fd78e0700898604846c2b39aa8d. Work branch:
cleanup/android-only. Audit date: 2026-11-06. No history rewrite or main merge.

## Decisions and boundaries

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
- Two-phone sync: deferred at the user's request while the second Android phone
  charges. Simulated sync tests pass; physical two-device acceptance remains pending.

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
| assets/icon.svg | Keep | Retained launcher/splash source assets, bundled fonts, and font license. |
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
| plugins/withAndroidLocaleConfig.js | Keep | Retained Android Gradle JVM or locale configuration plugin. |
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
| scripts/lib/find-chrome.mjs | Keep | Retained Android app asset generation or configuration guard; host OS support preserved. |
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
| src/components/AddIngredientsSheet.tsx | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/AddItemsSheet.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/AnimatedSplash.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/Credits.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/Dialogs.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/EmptyState.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/ErrorBoundary.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/FundingFooter.tsx | Remove | Replaced by FeedbackFooter; removed donation action, retained feedback and animation. |
| src/components/ItemEditor.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/ItemPicker.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/KitPicker.tsx | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
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
| src/components/Wordmark.tsx | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/__tests__/AboutRow.component.test.tsx | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/__tests__/Credits.component.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
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
| src/components/usePullRevealFooter.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/constants/tipProducts.ts | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/data/__tests__/aisleOrder.test.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/__tests__/categories.test.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/__tests__/seedCatalog.test.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/aisleOrder.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/aislePreferences.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/catalog.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/categories.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/categoryKeywords.ts | Remove | Obsolete English catalog tooling/classifier; reviewed LOD catalog is authoritative. |
| src/data/credits.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/kit.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/list.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/seedCatalog.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/data/seedCatalogData.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/feedback/FeedbackLogPreview.tsx | Remove | Removed unused email-report UI/composition; GitHub action and local diagnostics remain. |
| src/feedback/FeedbackProvider.tsx | Update | Retained bounded local diagnostics, privacy tests, and GitHub issue action; no upload. |
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
| src/i18n/de.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/es.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/fr.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/index.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/it.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/ja.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/localePreference.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/locales.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/pt-BR.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/shellLocales.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/i18n/shellStrings.ts | Update | Retained interface languages and accessibility tests; removed obsolete feature copy/directives. |
| src/lib/__tests__/aisleTransfer.test.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/lib/backup.ts | Remove | Unused generic legacy backup helper; active transfer.ts export/import remains. |
| src/lib/id.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/lib/links.ts | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/lib/tipJar.ts | Remove | Removed unused purchase, review, launch, promotion, or duplicate About feature. |
| src/lib/transfer.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/qa/__tests__/edgeInset.proof.test.tsx | Update | Retained test-only layout audit; Android representative dimensions and retained screens. |
| src/qa/__tests__/edgeInset.screens.test.tsx | Update | Retained test-only layout audit; Android representative dimensions and retained screens. |
| src/qa/edgeInset.ts | Update | Retained test-only layout audit; Android representative dimensions and retained screens. |
| src/qa/edgeInsetAudit.tsx | Update | Retained test-only layout audit; Android representative dimensions and retained screens. |
| src/qa/fixtures.example.ts | Remove | Removed production demo/capture mode and unused example fixture. |
| src/qa/fixtures.ts | Remove | List sample moved to test-only support; runtime seeding and demo secret removed. |
| src/qa/qaMode.ts | Remove | Removed production demo/capture mode and unused example fixture. |
| src/screens/KitDetailScreen.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/KitsHomeScreen.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/ListDetailScreen.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/ListsHomeScreen.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/ReorderAislesScreen.tsx | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/SettingsScreen.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/ShareScreen.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/__tests__/KitDetailScreen.screen.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/__tests__/KitsHomeScreen.screen.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/__tests__/ReorderAislesScreen.screen.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/__tests__/SettingsScreen.screen.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/__tests__/ShareScreen.screen.test.tsx | Update | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/screens/navTypes.ts | Keep | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
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
| src/store/__tests__/kits.test.ts | Keep | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/store/account.ts | Update | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/store/db.ts | Update | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/store/historyRank.ts | Keep | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/store/kits.ts | Update | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/store/lists.ts | Update | Retained state/persistence and tests; only obsolete runtime demo seeding removed. |
| src/sync/__tests__/clock.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/crypto.test.ts | Update | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/engine.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/engineDefaultTransport.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/intentFuzz.model.test.ts | Update | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/intentFuzz.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/mergeDupNames.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
| src/sync/__tests__/mergeKits.test.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
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
| src/sync/mergeKits.ts | Keep | Retained sharing protocol, clocks, crypto, transport, and automated convergence checks. |
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
| src/components/FeedbackFooter.tsx | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/components/__tests__/FeedbackFooter.component.test.tsx | Retained current Android app behavior or its tests; removed obsolete references/ownership restrictions where applicable. |
| src/sync/__tests__/support/listFixture.ts | Test-only list fixture, no production import or build-time share secret. |
| src/screens/__tests__/ListsHomeScreen.screen.test.tsx | Localized delete-confirmation regression tests for all supported interface languages. |
