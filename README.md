# Grocery List

An independent Android version of [Josh Williams's Grocery List](https://github.com/Josh-Approved/grocery-list), maintained in [haan/grocery-list](https://github.com/haan/grocery-list).

This Android-only app has two APK variants: **Grocery List** for everyday use without a PC, and **Grocery List Dev** for development with Metro and Fast Refresh. Both can be installed together with separate storage. It uses SQLite storage and encrypted synchronization through public Nostr relays.

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
npm run build:production
```

The cloud build uses Expo project `80882728-1f01-40c5-b4aa-56fcfa53f928`, owned by `lean-mean-coding-team`. Building requires an authorized Expo account. It does not submit to an app store.

Install the production APK on both household phones. Its teal icon distinguishes
it from the purple Dev app. Pair the everyday apps together; Dev invitations are
kept separate for disposable test lists. Everyday releases are installed as APK
updates, retaining their data; changes sent through Metro only affect Dev.
Compatible JavaScript and asset releases also arrive through Expo Updates.
Settings → Updates checks for a release and offers an explicit restart after
download. Production publication is deliberate, with a native-runtime check;
see the development guide. GitHub APK auto-updating is not implemented.

See [the development guide](docs/development.md) for installation, debugging, credentials, networking, and the device acceptance checklist.

## Shopping and sharing

The app opens directly into one shopping list. The header has Sharing and Settings;
a compact footer shows connection status. Settings contains Appearance, Language,
Sharing, Manage aisles, and Version. The language picker offers System, English,
and Lëtzebuergesch. Product suggestions and built-in aisle labels remain Luxembourgish
in either interface language. Countable products use reviewed plural labels such
as Banannen and Eeër; substances retain names such as Mëllech. Recent items remain local; favorites,
kits, and file import/export have been removed.

Opening Sharing does not publish anything. Start sharing creates a QR code/link;
scanning another code asks before replacing this phone's list. A joining phone
waits for a valid shared snapshot before editing or publishing. Stop sharing keeps
a private copy; starting again creates a new code. Other phones keep their own
copies. Public relay availability and retention are best-effort.

**Luxembourgish pre-release upgrade:** the first launch intentionally clears test
shopping data, sharing identities, learned/custom aisles and history, then creates
one empty private list. This reset is atomic and runs once. Appearance and language
remain. Update both test phones and pair them again. The new native localization
module requires a rebuilt development APK. Use disposable shopping data for development.

Translation review and Docker spelling checks are documented in
[scripts/language](scripts/language/README.md).

See [the repository audit](docs/repository-audit.md) for retained code and removed legacy tooling.

## License and attribution

Luxembourgish suggestions, shared aisle learning, and Manage aisles are documented
in the [catalog guide](scripts/lod/README.md), including regeneration and device checks.

Derived from Grocery List by Josh Williams. Original copyright and MIT license are retained in [LICENSE](LICENSE); third-party acknowledgements are in [CREDITS.md](CREDITS.md).
