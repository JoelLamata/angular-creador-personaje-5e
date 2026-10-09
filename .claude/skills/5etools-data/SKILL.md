---
name: 5etools-data
description: How to inspect and interpret the 5etools-format JSON in public/assets (classes, spells, feats, races, backgrounds, items). Use before answering any question about what the game data contains, when a feature, feat, spell or item shows up wrong or missing in the app, or when adding support for a new entry type or {@tag}.
---

# Working with the 5etools data

All rules data is static JSON under `public/assets/`. Never guess what a field contains; look it up. The files are large (several MB), so do not `Read` them whole.

## Looking something up

Use Grep for locating, then PowerShell for the actual object:

```powershell
# One entry, fully expanded
$j = Get-Content public\assets\feats.json -Raw | ConvertFrom-Json
$j.feat | Where-Object { $_.name -eq 'Skilled' -and $_.source -eq 'XPHB' } | ConvertTo-Json -Depth 12

# Which top-level arrays a file has
$j.PSObject.Properties.Name
```

Where things live:

| Data | File | Top-level key |
|---|---|---|
| Classes, subclasses and their features | `class/class-<name>.json` (listed in `class/index.json`) | `class`, `subclass`, `classFeature`, `subclassFeature` |
| Spells | `spells/spells-<source>.json` (listed in `spells/index.json`, keyed by source code) | `spell` |
| Spell lists per class | `spells/class-lists.json` | `{ "Wizard": ["Fireball", ...] }` |
| Species | `races.json` | `race`, `subrace` |
| Backgrounds | `backgrounds.json` | `background` |
| Feats | `feats.json` | `feat` |
| Invocations, metamagic, maneuvers | `optionalfeatures.json` | `optionalfeature` (filter by `featureType`) |
| Items | `items.json` + `items-base.json` | `item`, `baseitem`, `itemMastery` |
| Skills, languages | `skills.json`, `languages.json` | `skill`, `language` |

## Conventions that matter

- **Every entry has `name` + `source`.** The same name usually exists in several books. The app shows only sources in `ALLOWED_SOURCES` (`src/app/sourcesConfigService.ts`) and, when a name exists twice, prefers `XPHB` (2024 rules). When something is "missing", check its `source` first.
- **`_copy`**: an entry may inherit from another and patch it with `_mod`. Always go through `resolveCopies` (`utils/dnd-resolver.ts`); a raw entry with `_copy` has no usable `entries`.
- **Pipe-separated keys.** Class feature refs are `Name|Class|ClassSource|Level`, subclass feature refs are `Name|Class|ClassSource|SubShortName|SubSource|Level`. An empty source segment means `PHB`. Parse with `parseClassFeatureKey` / `parseSubclassFeatureKey`, never by hand.
- **`refClassFeature` / `refSubclassFeature`** entries point at another feature. Subclass refs are inlined by `inlineSubclassRefs`; the renderer drops any ref left unresolved.
- **Names in references are lowercase** (`"magic initiate; cleric|xphb"`, `"fireball|xphb"`). Use `DndDataService.cleanName`, `titleCase` and `stripTags` to display them.
- **Item `type` is `CODE|SOURCE`** (`"M|XPHB"`); split on `|` before mapping through `ITEM_TYPE_NAMES`. `value` is in copper pieces.
- **Proficiency lists** (`skillProficiencies`, `toolProficiencies`, ...) are arrays of groups: `{ arcana: true }` is fixed, `{ choose: { from, count } }` and `{ any: n }` are choices. Use `habilidadesFijas` / `eleccionesHabilidad` in `utils/reglas.ts`.

## Rendering entries and tags

`entries` is a tree of strings and typed objects (`entries`, `list`, `item`, `table`, `options`, ...). Strings contain inline tags such as `{@spell fireball|XPHB}` or `{@dice 1d6}`.

- HTML: `EntryProcessorService.processEntries(entries)` (returns `SafeHtml`; each tag becomes `<span class="tag tag-<name>">`).
- Plain text: `stripTags` in `utils/dnd-text.ts`.
- Both share `tagDisplay`, which picks the visible part of a tag. If a new tag renders its filter or link text instead of a label, add it to `TAGS_WITHOUT_DISPLAY_TEXT` there.
- An entry `type` that renders as nothing needs a branch in `EntryProcessorService.entryToString`.

## Tests read the real files

Rules specs load `public/assets` from disk by replacing `JsonReader` (see `LectorDeDisco` in `src/app/utils/elecciones.spec.ts`). Changing a JSON file can therefore break a spec, and a spec is the fastest way to confirm what the data yields:

```bash
npx ng test --no-watch --include src/app/utils/elecciones.spec.ts
```
