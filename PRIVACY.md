# Privacy

This describes the independent Android development app maintained in haan/grocery-list.

Your lists and items are stored in a local database on the phone. Sharing also publishes encrypted copies to public Nostr relays. Grocery-list sharing does not require an account. Developers sign into Expo to manage builds; that is separate from list sharing.

Product suggestions use a bundled Luxembourgish dictionary catalog without live
dictionary requests. Explicit aisle corrections are remembered per list, stored
on the phone, and included in that list's encrypted sharing and exported backups.
These preferences can contain product identifiers or the normalized names you
typed. Personal item history and favorites remain local to the device.

## Sharing a list

When you share a list with someone, the two phones keep each other up to date by passing small encrypted messages back and forth. A few things are true about this, by design:

- **No account, ever.** Sharing is a link or a QR code. Nobody signs up for anything.
- **We don't run a server.** The messages travel through free, public infrastructure that we don't own, operate, or pay for.
- **List contents are encrypted.** Messages use the secret embedded in the share link. Anyone with that link can join the list. Relays see ciphertext and transport metadata, including network addresses and event timestamps.
- **Relays retain encrypted copies.** The latest deposits allow another phone to catch up later. The app currently requests deposits from the preceding 21 days; relay retention and availability are outside our control.

## Where your data can go

- **On this device.** Everything lives in app storage on your phone.
- **In your own iCloud or Android backup, if you have it on.** Like any app, this app's data is included in the device backup your platform makes for you. That backup is yours. It runs on your account, which you control. We don't operate it and can't see it.
- **To someone with your share link.** Shared lists and kits are synchronized with paired devices. Treat the link or QR code as a secret; recipients can forward it.
- **In a file you export yourself.** If you export a list, the app hands a single file to the system share sheet and you choose where it goes. Nothing leaves until you pick a destination.
- **To development tools.** Development builds connect to Metro on the developer's computer for code and debugging. Debugging can expose application state to the developer. Use test data. A tunnel, when enabled, routes development traffic through its provider.
- **To Expo for distribution.** Builds and update downloads use the independent project's Expo services. Network requests expose ordinary connection and app-version metadata to those services; shopping lists are synchronized through Nostr, not Expo.
- **To GitHub if you submit feedback.** The feedback button opens an empty issue form in this repository. Logs and shopping-list contents are not attached automatically. Submitted issues may be public.

## What's collected

The app keeps a bounded diagnostic log locally for debugging. No analytics or automatic diagnostic-upload service is configured. Network providers described above handle requests under their own policies. The development app has no active donation or store-review flow.

## Questions

Use [the independent repository](https://github.com/haan/grocery-list). Do not include share secrets, credentials, or private shopping data in public issues.
