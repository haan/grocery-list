# Grocery List development

## Scope and reference documents

This is an independent Android app maintained in `haan/grocery-list`. Preserve
the upstream MIT copyright, [LICENSE](LICENSE), and [CREDITS.md](CREDITS.md).
Inherited app-shell files can be edited here; no external template
synchronization is active. Keep the app Android-only and use the existing Expo
project; never run `create-expo-app` to replace or reinitialize it.

Read the documents relevant to the change:

- [README.md](README.md): app overview and quick start.
- [ARCHITECTURE.md](ARCHITECTURE.md): code map, persistence, sharing, and compatibility invariants.
- [docs/development.md](docs/development.md): physical-device workflow, troubleshooting, builds, and releases.
- [docs/repository-audit.md](docs/repository-audit.md): historical cleanup decisions and retired tooling/features.
- [scripts/lod/README.md](scripts/lod/README.md): catalog edits and regeneration.
- [scripts/language/README.md](scripts/language/README.md): translation and spelling review.
- [qa/intent-fuzz/README.md](qa/intent-fuzz/README.md): model testing and regression replay.

## Toolchain and development

Use Node **26.12.1** from `.nvmrc` and npm **11.20.0** from `package.json`:

```sh
npm ci
npm run dev
```

The app uses **Expo SDK 57**. When changing Expo integration code, read
<https://docs.expo.dev/versions/v57.0.0/> and check `package.json` before applying
advice for another SDK.

Development uses the custom **Grocery List Dev** APK and Metro on a physical
Android phone. Expo Go lacks required native dependencies. No emulator or local
Android SDK is required for EAS cloud builds. Native dependencies, plugins, or
configuration changes require a rebuilt APK; see the development guide.

## Data and compatibility rules

- Preserve the single-list model, queued saves, and atomic sharing replacements.
  Pending joins must not edit or publish snapshots before durable adoption.
- Keep Nostr merge semantics compatible between installed versions of this fork.
  Preserve tombstones, independent clocks, fallback rules, snapshot validation,
  and protection against callbacks from obsolete sharing identities.
- Keep catalog product IDs stable: shared aisle preferences reference them.
  Edit the reviewed manifest and regenerate catalog output using its guide.
- Keep Recent history and appearance/language choices local. Product and built-in
  aisle labels remain Luxembourgish; interface strings support English and
  Luxembourgish. Preserve user-entered text literally.
- Keep test fixtures/helpers out of production imports. Use ignored `tmp/` for
  transient QA output and `qa/regressions/` for reviewed minimized regressions.

## Verification

For relevant code changes, run all four repository checks:

```sh
npm run check:android
npm run test:fuzz-harness
npm run typecheck
npm test -- --runInBand
```

Use the catalog/language guides for their additional checks when those inputs
change. For documentation-only edits, verify commands, paths, links, and claims
against the current source. Report what was checked and any limits; automated
tests do not establish physical-device acceptance.

## Builds, releases, and secrets

Keep Dev testing separate from household lists. Dev and everyday APKs have
different packages, storage, and invitation schemes. Do not put real sharing
links or secrets in logs, issues, screenshots, fixtures, or source control.
Never commit signing keys, access tokens, or credentials.

Use `npm run build:dev` or `npm run build:production` for the existing EAS
profiles. Preserve package identity and signing keys so APK updates retain data.
Production Expo Updates use `scripts/update-production.cjs` and the release
procedure in `docs/development.md`; never override a runtime fingerprint to force
compatibility. A push or merge alone does not release an update.
