# Grocery List

An Android shopping list that works offline and can share one list between phones
through encrypted Nostr messages. Data is stored locally in SQLite; sharing uses
public relays without an application server or user account.

This is an independent app maintained in
[haan/grocery-list](https://github.com/haan/grocery-list), derived from
[Josh Williams's Grocery List](https://github.com/Josh-Approved/grocery-list).

## Using the app

The app opens directly into your shopping list. Add items from the searchable
catalog or enter a custom name, then set quantity, aisle, and an optional note.
Manage aisles in Settings; explicit aisle corrections are remembered for future
additions and shared with the list. Recent suggestions stay on your phone.

Settings offers appearance, language, sharing, aisle management, updates, and
version information. Interface language can follow Android or be set to English
or Lëtzebuergesch. Product suggestions and built-in aisle labels stay
Luxembourgish in either interface language. The bundled catalog works offline.

Opening Sharing does not publish anything. **Start sharing** creates a QR code
and link. Joining another list asks for confirmation before replacing this
phone's list, then waits for a valid shared snapshot before allowing edits.
**Stop sharing** keeps a private copy; other phones retain their copies.
Starting again creates a new invitation.

Share links contain the list's secret: give them only to intended participants.
Public relay availability and retention are best-effort. See [PRIVACY.md](PRIVACY.md)
for data handling.

## Choose an APK

| | Everyday use | Development |
| --- | --- | --- |
| App name | Grocery List | Grocery List Dev |
| Icon background | Teal | Purple |
| Requires Metro / a PC | No | Yes, for the development workflow |
| Build command | `npm run build:production` | `npm run build:dev` |

Both APKs can be installed together with separate storage. Install the everyday
app on household phones and pair those apps together. Use Dev with disposable
lists for testing; invitations are restricted to the matching app variant.

Builds use the existing Expo project and require an authorized Expo account.
EAS produces APKs for direct installation, without submitting to an app store.
See the [development guide](docs/development.md) for sign-in, installation, and
project identity.

## Develop on a physical Android phone

Use Node **26.12.1** (see [.nvmrc](.nvmrc)) and npm **11.20.0**. The project uses
**Expo SDK 57**.

```sh
npm ci
```

Build and install the custom development APK using the
[first-installation steps](docs/development.md#first-installation). Expo Go does
not contain all required native dependencies. EAS cloud builds need no local
Android SDK or emulator.

Then start Metro:

```sh
npm run dev
```

Keep Metro running, connect the phone and PC to the same trusted Wi-Fi, and open
Grocery List Dev using the terminal QR code or its development-server picker.
JavaScript and UI edits use Fast Refresh. Native dependency or configuration
changes require a new development APK. Networking and debugging instructions
are in the [development guide](docs/development.md#everyday-edit-and-debug-loop).

Run the repository checks for code changes:

```sh
npm run check:android
npm run test:fuzz-harness
npm run typecheck
npm test -- --runInBand
```

## Updates

Install new everyday APKs as updates to retain local data. Compatible JavaScript
and assets can also arrive through Expo Updates; Settings → Updates checks for
them and offers a restart after download. Native changes require a new APK.
Publishing is deliberate and verifies native-runtime compatibility; follow the
[release instructions](docs/development.md#expo-updates-for-the-everyday-app).
Pushing or merging code alone does not update installed apps.

## Documentation

| Document | Use it for |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Code map, data flow, persistence, and synchronization invariants. |
| [AGENTS.md](AGENTS.md) | Contributor and coding-agent instructions. |
| [Development guide](docs/development.md) | Device setup, troubleshooting, releases, and acceptance checks. |
| [Catalog guide](scripts/lod/README.md) | Reviewed Luxembourgish products, stable IDs, and regeneration. |
| [Language review](scripts/language/README.md) | Translation conventions and Docker spelling checks. |
| [Model testing](qa/intent-fuzz/README.md) | Fuzz seeds, replay, and regression fixtures. |
| [Repository audit](docs/repository-audit.md) | Historical cleanup decisions and retired tooling/features. |

## License and attribution

Derived from Grocery List by Josh Williams. The original copyright and MIT
license are retained in [LICENSE](LICENSE). Third-party acknowledgements are in
[CREDITS.md](CREDITS.md).
