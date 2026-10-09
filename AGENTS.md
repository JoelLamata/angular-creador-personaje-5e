# AGENTS.md

This file provides guidance to AI coding agents working with code in this repository.

## Project

D&D 5e compendium and character creator. Angular 21 (standalone components, SSR/prerender), PrimeNG with the Material preset, Firestore for saved characters. Code identifiers, comments and UI text are in Spanish; keep new code consistent with that.

## Commands

```bash
npm start                 # ng serve, http://localhost:4200
npm run build             # production build to dist/ (SSR output mode)
npm run watch             # development build in watch mode
npm test                  # unit tests (Vitest via @angular/build:unit-test, jsdom)
npx ng test --no-watch    # single run
npx ng test --include src/app/utils/reglas.spec.ts   # one spec file
npx ng deploy             # publish to GitHub Pages (angular-cli-ghpages)
```

There is no lint target. Formatting is Prettier, configured in `package.json` (100 columns, single quotes, Angular parser for HTML).

## Architecture

### Two kinds of character

These are separate data sources with separate routes and must not be confused:

- **Imported characters** — D&D Beyond JSON exports in `public/assets/characters/<name>.json`. Listed on `/` (`SeleccionPersonaje`) and shown at `/:nombre` (`Personaje`), using the sheet components in `src/app/components/` (documented in `src/app/components/README.md`).
- **Created characters** — `PersonajeCreado` (`models/personaje.model.ts`), built by the wizard under `/crear` and stored in the Firestore collection `personajes`. Listed at `/creados`, viewed at `/creados/:id`, edited at `/editar/:id`.

`/:nombre` matches any single segment, so fixed routes must be declared before it in `app.routes.ts`.

### Game data pipeline

All rules data is static 5etools-format JSON in `public/assets/` (classes and spells are split per file with an `index.json`).

1. `JsonReader` (`json-reader.ts`) fetches and caches raw files. It resolves URLs against `document.baseURI` so the app works under a sub-path (GitHub Pages).
2. `DndDataService` normalises that data for pages and the creator, and filters everything through `ALLOWED_SOURCES` in `sourcesConfigService.ts`. Content from a book not in that list is invisible everywhere; add the source code there to enable it.
3. `utils/dnd-resolver.ts` handles 5etools indirection: `_copy` inheritance (`resolveCopies`) and `refSubclassFeature`-style references, which are keyed as pipe-separated strings (`parseClassFeatureKey`, `parseSubclassFeatureKey`).
4. `EntryProcessorService` and `utils/dnd-text.ts` turn 5etools `entries` and inline `{@tag ...}` markup into display HTML/text.

### Character creator

- `CreadorService` holds the draft `PersonajeCreado` in a `BehaviorSubject` and mirrors it to `sessionStorage` (`creador-borrador`). Each `crear/paso-*` step component reads and patches the draft through `actualizar()`. The same service and steps are reused for editing via `cargar()`.
- Loaded or restored characters are merged over `personajeNuevo()`, so a new field on `PersonajeCreado` needs a default there to stay compatible with already-saved documents.
- `FichaService` derives everything displayed (modifiers, proficiencies, features, resolved choices) from a `PersonajeCreado` plus the rules data. Derived values are not stored.
- Rules logic lives in pure functions in `utils/` (`reglas.ts` for abilities, equipment and spellcasting; `elecciones.ts` for the per-level choices a class/species/feat grants; `dotes.ts` for feats). This is where the spec files are; put new rules logic here rather than in components.

### Firestore and SSR

- `PersonajesService` imports the Firebase SDK lazily and only in the browser, keeping it out of the initial bundle and out of server rendering.
- `app.routes.server.ts` sets `crear`, `creados` and `editar` to `RenderMode.Client` because they depend on Firestore or `sessionStorage`; everything else is prerendered. A new route that touches browser-only state needs an entry there.
- Firebase config is in `src/environments/environment.ts` (public by design). Access control is `firestore.rules`: open read/write with no auth, documents capped at 50 KB.

### UI conventions

- PrimeNG modules are shared through `PRIMENG_IMPORTS` in `primeng.imports.ts`.
- Theme tokens are CSS variables in `src/styles/_tokens.scss`; dark mode is the `.dark` class on an ancestor.
- Production builds fail if any component stylesheet exceeds 8 kB (`angular.json` budgets).
