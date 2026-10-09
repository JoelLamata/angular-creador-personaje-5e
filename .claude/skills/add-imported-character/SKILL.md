---
name: add-imported-character
description: Add, update or remove a D&D Beyond character shown on the home page and at /<name> (the JSON files in public/assets/characters). Use when asked to add a player's character from D&D Beyond, refresh one after a level-up, or fix an imported character that does not load.
---

# Imported (D&D Beyond) characters

These are static files, unrelated to the creator and Firestore. The home page (`SeleccionPersonaje`) shows a card per name; `/:nombre` (`Personaje`) renders the sheet from the same file.

## Adding one

1. **Get the JSON.** It is the D&D Beyond character service response, wrapper included. The app reads `result.data`, so the file must look like:
   ```json
   { "id": 0, "success": true, "message": "...", "data": { "id": 160510272, "name": "...", "stats": [...], "classes": [...] } }
   ```
   The user has to provide it (it comes from `https://character-service.dndbeyond.com/character/v5/character/<id>` for a public character). Do not invent or hand-edit character data.

2. **Save it** as `public/assets/characters/<Nombre>.json`.

3. **Register the name** in the `personajes` array in `src/app/seleccion-personaje/seleccion-personaje.ts`.

The string in the array is used three ways: as the URL (`/<Nombre>`), as the file name (`characters/<Nombre>.json`) and as the fallback display name. So it must match the file name **exactly, including case and spaces**. The Windows dev server is case-insensitive and hides mismatches; GitHub Pages is not and returns 404. Verify with:

```powershell
Get-ChildItem public\assets\characters -Name
```

The name must not collide with a fixed route (`clases`, `hechizos`, `especies`, `trasfondos`, `dotes`, `objetos`, `crear`, `creados`, `editar`), since those are matched first.

## Updating after a level-up

Replace the file contents with a fresh export, keeping the file name. Nothing else changes.

## Removing

Delete the file and its entry in `personajes`.

## What the sheet reads

`Personaje` (`src/app/personaje/personaje.ts`) reads D&D Beyond fields directly: `stats[0..5]`, `modifiers.*`, `classes[].definition`, `race`, `actions`, `spells`, `decorations.avatarUrl`. Spell and class details are then looked up by name in the 5etools data, limited to `ALLOWED_SOURCES`. A spell or feature that shows no description is usually from a book that is not enabled (see `enable-source-book`), not a problem with the character file.

The card on the home page (`PlayerSelectorComponent`) reads `name`, `decorations.avatarUrl`, `classes[].level`, `race.baseRaceName` and `classes[].definition.name`.

## Verify

`npm start`, open `/`, confirm the card shows portrait, level, species and class, then click through and check the browser console for a failed `characters/<Nombre>.json` request.
