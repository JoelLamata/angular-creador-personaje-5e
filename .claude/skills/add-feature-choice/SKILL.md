---
name: add-feature-choice
description: Make the character creator ask for a decision that a class feature, subclass feature or feat grants (Expertise, a fighting style, a totem option, extra proficiencies, languages, weapon masteries, spells from a feat). Use when a choice is missing from the "Rasgos" step, has the wrong count or options, or does not affect the sheet.
---

# Adding a feature choice to the creator

Choices are described by `EleccionDef` (`src/app/utils/elecciones.ts`) and stored in `PersonajeCreado.elecciones` as `clave -> string[]`. The "Rasgos" step (`crear/paso-rasgos`) renders one panel per definition; `FichaService.construir` applies the answers.

## 1. Find out how the data describes it

Look the feature up first (see the `5etools-data` skill). There are three cases:

- **Already structured** in the class/subclass definition: `featProgression` (fighting styles, epic boons), `optionalfeatureProgression` (invocations, metamagic, maneuvers), or an `options` entry made only of `refClassFeature` (Divine Order). These are picked up automatically by `calcularElecciones`. If one is missing, the bug is in that function, not in the catalog.
- **A feat**: read from the feat's own fields in `eleccionesDeDote` (`utils/dotes.ts`): `skillProficiencies`, `skillToolLanguageProficiencies`, `toolProficiencies`, `expertise`, `resist`, `optionalfeatureProgression`, `additionalSpells`. Add a block there for a field that is not handled yet.
- **Only prose** (most class features): declare it in the catalog, below.

## 2. Catalog entry

`CATALOGO_CLASE` is keyed `Class|Feature name`; `CATALOGO_SUBCLASE` is keyed `Class|SubclassShortName|Feature name`. Names must match the data exactly (English, same capitalisation, the subclass `shortName` not its full name).

```ts
'Wizard|Scholar': [
  { tipo: 'experiencia', cantidad: 1, de: ['arcana', 'history', ...] },
],
'Barbarian|Wild Heart|Rage of the Wilds': OPCION_ENTRADAS,
```

| `tipo` | Meaning | Extra fields |
|---|---|---|
| `experiencia` | Expertise in an already proficient skill | `de` (allowed skills, lowercase; omit for any) |
| `competencias` | New skill proficiencies | `de`, or `deClase: true` for the class skill list, or `de: null` for any |
| `opcion` | One of several named options | `opciones: [...]`, or `desdeEntradas: true` to use the feature's named sub-entries |
| `maestria` | Weapon masteries (count comes from the class table) | `filtroArma: 'cuerpo' \| 'sutil'` |
| `idiomas` | Languages | |

A feature may list several items; each gets its own panel. `dote`, `rasgoOpcional`, `herramientas`, `habilidadesHerramientas` and `hechizos` exist as types but are produced from structured data, not from the catalog.

## 3. Keys are persisted

`clave` is `origen|feature|level|index` for class features and `dote|slot|name|suffix` for feats. It is stored in Firestore, so changing how a key is built orphans the answers of saved characters (`filtrarEleccionesVigentes` silently drops unknown keys). Add new keys; do not rename existing ones.

## 4. A new `tipo`

Needs all of: the `TipoEleccion` union, a `case` in `PasoRasgos.construirPanel` to build `posibles` (chips) or `items` (searchable list), `esChips` if it uses chips, and its effect in `FichaService.construir` via `deTipo('<tipo>')`.

## 5. Make it count on the sheet

A choice that only appears in the list of resolved choices needs nothing more. If it changes numbers or proficiencies, wire it in `FichaService.construir` (see how `competencias`, `experiencia`, `idiomas` and `herramientas` feed `competentes`, `expertos`, `idiomas`, `herramientas`).

## 6. Test against the real data

Add a case to `src/app/utils/elecciones.spec.ts` (class features) or `dotes.spec.ts` (feats). They load the real JSON, so the test proves the name matches:

```ts
it('Wizard: Scholar da una Expertise entre seis habilidades', () => {
  expect(resumen('Wizard', 2)).toContain('Scholar@2:experienciax1');
});
```

```bash
npx ng test --no-watch --include src/app/utils/elecciones.spec.ts
```

Then check the panel in the browser at `/crear/rasgos` with that class and level selected.
