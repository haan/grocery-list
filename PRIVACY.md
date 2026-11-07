# Privacy

This describes the independent Android development app maintained in haan/grocery-list.

Your shopping list and items are stored in a local database on the phone. Sharing also publishes encrypted copies to public Nostr relays. Grocery-list sharing does not require an account. Developers sign into Expo to manage builds; that is separate from list sharing.

Product suggestions use a bundled Luxembourgish dictionary catalog without live
dictionary requests. Explicit aisle corrections are remembered per list, stored
on the phone, and included in that list's encrypted sharing.
These preferences can contain product identifiers or the normalized names you
typed. Recent item history remains local to the device. Favorites and file import/export
are no longer available.

## Sharing a list

When you share a list with someone, the two phones keep each other up to date by passing small encrypted messages back and forth. A few things are true about this, by design:

- **No account, ever.** Sharing is a link or a QR code. Nobody signs up for anything.
- **We don't run a server.** The messages travel through free, public infrastructure that we don't own, operate, or pay for.
- **List contents are encrypted.** Messages use the secret embedded in the share link. Anyone with that link can join the list. Relays see ciphertext and transport metadata, including network addresses and event timestamps.
- **Relays retain encrypted copies.** The latest deposits allow another phone to catch up later. The app currently requests deposits from the preceding 21 days; relay retention and availability are outside our control.

Stopping sharing keeps a private copy on this phone. It does not delete other
phones' data or relay deposits. Starting again creates a new secret. Joining a
different code replaces this phone's current list only after confirmation.
The Luxembourgish pre-release upgrade performs a one-time local shopping-data reset; it does
not erase copies previously shared with other phones or relays.

Interface translations and product labels are bundled and work offline. Your
language preference stays on your device. The app does not send text to LOD,
Spellchecker.lu or a translation service; dictionary downloads and spelling checks
are developer tools outside the application.

## Where your data can go

- **On this device.** Everything lives in app storage on your phone.
- **In Android device backups, when enabled and supported.** The app does not disable Android backup; what is backed up depends on device settings and the backup provider. That backup is yours. It runs on your account, which you control. We don't operate it and can't see it.
- **To someone with your share link.** Shared lists are synchronized with paired devices. Treat the link or QR code as a secret; recipients can forward it.
- **To development tools.** Development builds connect to Metro on the developer's computer for code and debugging. Debugging can expose application state to the developer. Use test data. A tunnel, when enabled, routes development traffic through its provider.
- **To Expo for distribution.** Builds and update downloads use the independent project's Expo services. Network requests expose ordinary connection and app-version metadata to those services; shopping lists are synchronized through Nostr, not Expo.

## What's collected

The app keeps a bounded diagnostic log locally for debugging. No analytics or automatic diagnostic-upload service is configured. Network providers described above handle requests under their own policies. The app has no donation or store-review features.

## Questions

Use [the independent repository](https://github.com/haan/grocery-list). Do not include share secrets, credentials, or private shopping data in public issues.
