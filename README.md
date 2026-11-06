# Grocery List Dev

An independent Android version of [Josh Williams's Grocery List](https://github.com/Josh-Approved/grocery-list), maintained in [haan/grocery-list](https://github.com/haan/grocery-list).

This Android-only app uses a development APK on a physical phone, with Fast Refresh from a local PC. It retains SQLite storage and encrypted synchronization through public Nostr relays.

## Development

Use Node **26.12.1** and npm **11.20.0**:

```sh
npm ci
npm run dev
```

Install our custom development APK first; Expo Go does not contain all native dependencies. Open the development app on the same Wi-Fi network as your PC and scan Metro's QR code with your phone's camera. No emulator is required. The development server must remain running.

```sh
npm run check:android
npm run test:fuzz-harness
npm run typecheck
npm test -- --runInBand
npm run build:dev
```

The cloud build uses Expo project `80882728-1f01-40c5-b4aa-56fcfa53f928`, owned by `lean-mean-coding-team`. Building requires an authorized Expo account. It does not submit to an app store.

See [the development guide](docs/development.md) for installation, debugging, credentials, networking, and the device acceptance checklist.

## Sharing and feedback

The development app has its own Android identity and share-link scheme and can coexist with the original app. Use disposable lists for development and device acceptance.

Feedback opens this repository's issue form without automatically including diagnostic logs. There are no purchase, store-review, or promotion features. Public relay availability is best-effort.

See [the repository audit](docs/repository-audit.md) for retained code and removed legacy tooling.

## License and attribution

Luxembourgish suggestions, shared aisle learning, and Manage aisles are documented
in the [catalog guide](scripts/lod/README.md), including regeneration and device checks.

Derived from Grocery List by Josh Williams. Original copyright and MIT license are retained in [LICENSE](LICENSE); third-party acknowledgements are in [CREDITS.md](CREDITS.md).
