# Luxembourgish language review

The app ships only `src/i18n/lb.json` and the compact LOD catalog. Hunspell,
downloaded dictionaries, and Docker are developer tools, never app dependencies.

Run from the repository root:

```powershell
node scripts/language/fetch-dictionary.cjs
docker build -t grocery-list-lb-spellcheck scripts/language
npm run language:spellcheck
```

The download is pinned to the official dictionary repository commit and SHA-256
hashes in `source.json`, including `LICENSE.txt` (EUPL 1.1; Michel Weimerskirch
and Sandra Souza Morais). Files stay under ignored `tmp/lb-spelling/`, outside
Git and EAS uploads. The image uses a pinned Ubuntu base and Hunspell 1.7.2.
At check time the container has no network and mounts only the dictionary,
read-only; strings are supplied over stdin. Other Docker containers are untouched.

`npm run language:review` generates the English/Luxembourgish review table
without Docker. `language:spellcheck` also generates the spelling report and
fails on unreviewed findings. Context-specific exceptions in
`spelling-exceptions.json` explain LOD-backed forms and deliberate technical
terms. Do not add exceptions just to make the command pass. Hunspell does not
check grammar, word order, n-rule context, or whether a shopping label should
be singular or plural. Foreign product search aliases are not LB interface text
and are excluded from this check.

## Terminology and editorial choices

| English | Luxembourgish | Use |
|---|---|---|
| Shopping list | Akafslëscht | Home title and Settings group |
| Item | Artikel | Product on the shopping list |
| Aisle | Rayon | Store section, including custom sections |
| Manage aisles | Rayone verwalten | Settings action |
| Quantity | Quantitéit | Desired total, independent of label grammar |
| Note | Notiz | Optional item details |
| Suggestion | Virschlag | Catalog or personal Recent entry |
| Save | Späicheren | Confirm an edit |
| Cancel | Ofbriechen | Discard the draft |
| Remove | Ewechhuelen | Remove from the shopping list |
| Forget suggestion | Virschlag läschen | Remove from personal suggestions |
| Undo | Réckgängeg maachen | Restore the preceding action |
| Checked | Ofgehaakt | LOD OFHAKEN1 past participle |
| Sync | Ofgläichen | LOD OFGLAICHEN1; comparing/updating lists |
| Sharing | Deelen | List invitation and connection controls |
| Pantry | Spënnchen | LOD SPENNCHEN1; replaces German Vorrat |

Use concise labels, informal **du** in instructions, and whole translated
sentences. Technical status durations use `min`/`h` abbreviations to avoid
number-dependent n-rule prefixes. Accessibility counts use a neutral
`Unzuel: {count}` where needed. Context determines n deletion, for example
`Artikelen dobäisetzen` but `Artikele sichen`. Names supplied by users remain
literal; no runtime grammar correction is attempted.

Built-in aisle names and product names remain Luxembourgish even with an English
interface. The installed application name remains Grocery List Dev. Android owns
keyboard, permission-dialog and system-share-sheet wording.
