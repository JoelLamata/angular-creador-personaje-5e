# Componentes de ficha de personaje

Los componentes usan tokens CSS definidos en `src/styles/_tokens.scss`. Cambian de tema aplicando la clase `.dark` en `body`, `html` o cualquier contenedor superior.

## PlayerBaseComponent

```html
<app-player-base [character]="character"></app-player-base>
```

Inputs principales:
- `character`: objeto completo del personaje.
- `name`, `avatarUrl`, `level`, `race`, `characterClass`: sobrescriben datos de identidad.
- `hitPoints`, `armorClass`, `speed`: sobrescriben métricas vitales.

## PlayerStatsComponent

```html
<app-player-stats label="DEX" [value]="16" modifier="+3"></app-player-stats>
```

Inputs:
- `label`: abreviatura de la estadística.
- `value`: puntuación base.
- `modifier`: modificador formateado.

## PlayerActionComponent

```html
<app-player-action [action]="action" type="action"></app-player-action>
```

Inputs:
- `action`: objeto de acción de clase/raza/dote.
- `type`: `action`, `bonus` o `reaction`.
- `name`, `description`, `attack`, `damage`: sobrescriben valores concretos.

## SpellComponent

```html
<app-spell [spell]="spell" [prepared]="true"></app-spell>
```

Inputs:
- `spell`: objeto de hechizo del compendio.
- `prepared`: cambia la presentación visual para hechizos preparados o atenuados.
