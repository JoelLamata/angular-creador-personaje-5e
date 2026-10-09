---
name: extend-character-creator
description: Add or change a step of the /crear character wizard, or add a field to a created character (PersonajeCreado) and show it on the sheet. Use for anything that changes what the creator asks, stores in Firestore, or displays in the resumen and /creados/:id sheet.
---

# Extending the character creator

Data flow: step component → `CreadorService.actualizar()` → draft `PersonajeCreado` (memory + `sessionStorage`) → `FichaService.construir()` derives a `Ficha` → `app-ficha-creada` displays it → `PersonajesService.guardar()` writes the draft to Firestore.

Store **decisions**, derive **results**. Anything computable from the decisions plus the rules data belongs in `Ficha`, not in `PersonajeCreado`.

## Adding a field to `PersonajeCreado`

1. `src/app/models/personaje.model.ts`: add it to the interface **and** to `personajeNuevo()`. Loaded and restored characters are merged over `personajeNuevo()`, so the default is what characters saved before the change will get. A field without a default is `undefined` on old documents.
2. Store references as `{ name, source }` (`Referencia`), not copies of game data. Documents are capped at 50 KB by `firestore.rules`.
3. `guardar()` strips `undefined` through a JSON round-trip, so use `null` for "not chosen" if the distinction matters.
4. If it affects derived values, add the result to the `Ficha` interface and compute it in `FichaService.construir`. Put the rules logic in a pure function in `utils/reglas.ts` with a spec, and call it from the service.
5. Display it in `components/ficha-creada/` (used by both the resumen step and `/creados/:id`).

If the "field" is really a choice granted by a class feature or feat, do not add a field; use the `add-feature-choice` skill, which stores it in `elecciones`.

## Adding a step

Steps live in `src/app/crear/paso-<nombre>/`. Copy `paso-trasfondo` (selection from a list plus options) or `paso-equipo` (needs the derived `Ficha`).

- `styleUrls: ['../crear-shared.scss']` gives the shared classes: `paso-title`, `paso-help`, `panel`, `panel-title`, `grid`, `campo`, `select`, `chips`, `chip` / `chip--on`, `btn-row`, `aviso` / `aviso--error`, `muted`, `descripcion`. Add a step-specific `.scss` only for what is missing.
- Pick from long lists with `<app-info-list [mostrarCabecera]="false" [selectable]="true" [selectedId]="..." (choose)="...">`; use `selectedIds` for multi-select.
- Read the draft with `this.creador.borrador`; write with `this.creador.actualizar({...})`. Most steps save on every change (`paso-trasfondo`, `paso-equipo`, `paso-rasgos`) so the side summary and a page reload stay current; `paso-clase-detalle` saves only on "Continuar". Prefer saving on change for new steps.
- In `ngOnInit`, restore the UI from the existing draft. The same steps are used to edit a saved character (`/editar/:id` loads it and jumps to the resumen), so a step must render a fully populated character correctly.
- When a selection invalidates dependent answers, clear them in the same `actualizar` call (`paso-clase-detalle` discards `elecciones` when the class or subclass changes).
- Expose a `completo` getter, disable "Continuar" on it and explain what is missing in an `aviso`.
- Async loading follows the project pattern: `try/catch/finally`, `loading = false`, then `cdr.detectChanges(); cdr.markForCheck();`.

Wire it in three places:

1. `app.routes.ts`: child of `crear`.
2. `crear/crear.ts`: the `pasos` array (order = step bar).
3. The "Atrás" link and `continuar()` target of the two neighbouring steps.

`app.routes.server.ts` already marks `crear/**` as client-rendered. If the step is required to save, add it to `pendientes` in `paso-resumen.ts`.

## Verify

```bash
npx ng test --no-watch
npm start
```

In the browser: complete the wizard to the resumen, reload mid-way (the draft must survive), save, open `/creados/<id>`, then use edit and confirm the step shows the saved values. Also open a character saved before the change to confirm the default applies.
