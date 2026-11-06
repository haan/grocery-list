# LOD shopping catalog

The runtime catalog is a reviewed selection of **371 products**, independently
derived from the supplied Lëtzebuerger Online Dictionnaire XML. It covers food,
drinks, household consumables, and toiletries. It is not a translation of the
inherited English suggestion list or a complete inventory of supermarket goods.

Source: [LOD linguistic data, Zentrum fir d'Lëtzebuerger Sprooch](https://data.public.lu/fr/datasets/letzebuerger-online-dictionnaire-lod-linguistesch-daten/).
The dataset is released under **CC0-1.0**. See `source.json` for its SHA-256.
The app's inherited MIT notices remain unchanged.

## Editing and generating

`manifest.json` is the reviewed source of truth: permanent product IDs, preferred
Luxembourgish names, LOD entry/meaning references, approved aliases, and aisles.
Keep IDs stable when editing labels or extending aliases. Do not reuse retired
IDs for a different product: shared learned rules reference those IDs.

Run from the repository root with Node 26.12.1:

```powershell
npm ci
npm run catalog:build -- tmp/new_lod-art.xml
```

Generation validates references and uniqueness, writes `src/data/seedCatalogData.ts`,
and produces the per-aisle `review.md`, including ambiguous aliases. Identical
inputs generate identical outputs. Normal app builds and CI use the checked-in
runtime catalog and do not need the XML. `tmp/` is ignored by Git and the default
EAS upload rules. The XML is never imported by the app.

`selection.cjs` records the initial meaning review. `--select` bootstraps a new
manifest from that selection and **overwrites manifest edits**; it is not the
normal regeneration command. `read.cjs` reads one XML entry at a time. `sax` is a
development dependency only.

## Review decisions

- Topic tags were used to find candidates, not to accept every tagged entry.
  Cooking verbs, utensils, figurative meanings, plant-only meanings and drink
  serving counts were excluded. Household meanings were reviewed separately.
- One product groups confirmed synonyms, Luxembourgish plurals/n-rule forms,
  and suitable French/German translations. Common foreign plurals are explicit
  aliases, not generated guesses. Qualified secondary headwords remain separate.
- Multiple meanings sharing an alias remain ambiguous. Different possible
  aisles give Other; equally categorized meanings can classify but do not teach
  a product-wide rule. For example, `Paprika` can mean a pepper or a spice.
- Current aisle assignments are defaults; explicit corrections override them
  within the shared list. There is no inference from unrelated old list items.
- Manage aisles supports renaming custom aisles with the pencil button. A rename
  preserves the aisle's position and updates its live items and learned rules
  together, using the existing list/item/preference synchronization clocks.
  Empty names, built-in aisle keys, and duplicate names are rejected. Built-in
  labels stay fixed; custom names keep the existing 40-character limit.
- The old `scratch/seed` assets and keyword tables are historical upstream data;
  they are not used by the runtime catalog or classifier.

## Device acceptance

Use a disposable list, separate from household lists. With Metro running:

- [ ] Search `mellech`, `Kartoffeln`, and `champignon`; check Luxembourgish suggestions.
- [x] Add Mëllech, move it to a custom aisle, delete it, and add Milch. It should
      use the custom aisle. Close/reopen and repeat to check persistence.
- [ ] Correct `Bio Mëllech 1L` separately; it must not change every milk product.
- [ ] Rename a custom aisle using its pencil button. Check that its items stay
      there and a learned alias still lands there after deleting/re-adding it.
- [x] In Manage aisles, check that Add aisle matches Add an item. Drag an aisle
      by its three-line handle; keep dragging near an edge to check auto-scrolling.
- [ ] Close/reopen Manage aisles and check that the dragged order persists.
- [ ] In Manage aisles, add an aisle without editing an item, reorder it, then
      delete it. Its items should be classified again using remaining preferences or
      the catalog; unknown items move to Aneres. Deleted-aisle rules stop applying.
- [ ] On a second updated installation, share only the disposable list. Make
      unrelated corrections while disconnected, reconnect, and verify both rules.

Automated tests cover classification, learning, real SQLite migration/round trips,
export/import, UI controls, and simulated merge convergence. Physical-device
acceptance remains separate from those checks.

Verified on 2026-11-06: clean `npm ci --offline`, TypeScript, all 515 tests in
55 suites, deterministic catalog regeneration, and Android bundle serving through
Metro. No native dependencies were changed. The device checkboxes above remain
unchecked until confirmed on hardware.

Pixel 8 / Android 17 confirmation on 2026-11-06: the app opens after the Metro
manifest fix; creating Test aisle, correcting Mëllech, deleting it, and adding
Milch preserves the learned aisle, including after closing and reopening the app.
The remaining device checks and two-phone sharing are not yet confirmed.

Drag-handle update on 2026-11-06: TypeScript and all 524 tests in 56 suites pass;
Metro serves the startup manifest and Android bundle successfully. The new
JavaScript-only draggable list uses the gesture/animation libraries already in
the development APK. The user confirmed dragging, edge scrolling, and matching
Add aisle / Add an item styling on the Pixel 8 on 2026-11-06.
