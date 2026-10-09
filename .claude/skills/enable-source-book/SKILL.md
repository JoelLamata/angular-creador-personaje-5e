---
name: enable-source-book
description: Enable, disable or add a sourcebook (PHB, XPHB, TCE, XGE, EGW...) or update the 5etools JSON data files in public/assets. Use when content from a book should appear or disappear in the compendium and creator, when adding a new spells or class data file, or when entries from a book are unexpectedly missing or duplicated.
---

# Sourcebooks and data files

## Turning a book on or off

`src/app/sourcesConfigService.ts`:

```ts
export const ALLOWED_SOURCES: readonly string[] = ['XMM', 'XDMG', 'XPHB', 'FRHoF', 'FTD', 'MPMM', 'TCE', 'XGE'];
```

Use the exact 5etools source code as it appears in the `source` field (case-sensitive: `FRHoF`, `AitFR-AVT`). Everything loaded through `DndDataService` is filtered by this list.

Adding the code is only enough if the data is already present. Check:

```powershell
# How many entries of each kind a source has
foreach ($f in 'feats','races','backgrounds','items','optionalfeatures') {
  $j = Get-Content "public\assets\$f.json" -Raw | ConvertFrom-Json
  foreach ($k in $j.PSObject.Properties.Name) {
    $n = @($j.$k | Where-Object { $_.source -eq 'EGW' }).Count
    if ($n) { "$f.$k : $n" }
  }
}
```

## Side effects to check when enabling a book

- **2014 and 2024 together.** Classes, spells and optional features with the same name are deduplicated in favour of `XPHB`. Feats, species, backgrounds and items are **not**: enabling `PHB` alongside `XPHB` lists both versions. `resolverDote` prefers `XPHB` when looking a feat up by name.
- **Classes** are matched by `className` + `classSource`. A subclass from the new book appears only under the class version it was written for (a 2014 subclass has `classSource: 'PHB'` and will not attach to the `XPHB` class).
- **Hard-wired to 2024 regardless of the list:** languages, weapon masteries and tool lists read `XPHB` only; skills read `PHB`/`XPHB`; optional features fall back to `PHB` when no allowed source has the requested type.
- **Feature choices** in `utils/elecciones.ts` are keyed by class and feature name. New subclasses with prose-only choices need catalog entries (see `add-feature-choice`).

## Adding a spells file

1. Drop `spells-<code>.json` in `public/assets/spells/`.
2. Register it in `spells/index.json`. The **key must equal the source code** exactly, because the spells page (`hechizos/hechizos.service.ts`) matches index keys against `ALLOWED_SOURCES`:
   ```json
   "EGW": "spells-egw.json"
   ```
3. Add the code to `ALLOWED_SOURCES`.
4. Update `spells/class-lists.json` (class name → spell names). The creator offers a class only the spells named there; a new spell missing from it shows in the compendium but cannot be picked. Nothing in the repo generates this file, so edit it by hand.

There are two spell loaders: the `/hechizos` page uses `HechizosService` (loads only allowed files, no dedupe), the creator uses `DndDataService.getHechizos` (loads every file, filters by `source`, prefers `XPHB`). Check both.

## Adding a class file

Add `class-<name>.json` to `public/assets/class/` and a lowercase key to `class/index.json`. `buildClass` takes the `XPHB` definition if present, otherwise the first allowed one, and returns nothing if none is allowed.

## Replacing data with a newer 5etools dump

Keep file names and the `index.json` files. Then run the full suite, since the rules specs assert against the real files and will show what changed:

```bash
npx ng test --no-watch
```

A failing spec after a data update usually means a feature was renamed or a progression changed; fix the catalog in `utils/elecciones.ts` or the expectation, whichever is now wrong.

## Verify

`npm start`, then check the book in the source filter of `/dotes`, `/especies`, `/objetos` and `/hechizos`, and that `/crear/clase` still shows each class once.
