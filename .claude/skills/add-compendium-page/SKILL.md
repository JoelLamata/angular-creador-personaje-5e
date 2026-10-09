---
name: add-compendium-page
description: Add a new read-only reference page to the compendium (like Especies, Trasfondos, Dotes, Objetos) that lists entries from public/assets with search and filters. Use when asked for a page for conditions, languages, optional features, actions, rules or any other data file.
---

# Adding a compendium page

Compendium pages are thin: a `DndDataService` getter, a mapper to `InfoItem`, and `<app-info-list>`. `src/app/especies/` and `src/app/objetos/` are the reference implementations. Names are Spanish (`condiciones`, `idiomas`).

## 1. Data getter in `DndDataService`

```ts
getCondiciones(): Promise<DndEntry[]> {
  return this.memo('condiciones', async () => {
    const data = await this.jsonReader.getData('conditionsdiseases.json');
    return (data.condition ?? []).filter(isAllowed).sort((a, b) => a.name.localeCompare(b.name));
  });
}
```

- Wrap in `memo` with a unique key.
- Filter with `isAllowed` unless the data only exists in one edition (skills and languages filter by source explicitly).
- Run `resolveCopies` first if entries use `_copy` (backgrounds do).
- If the same name exists in several allowed sources, keep the `XPHB` one (see `getHechizos`).

Check the file's top-level key and fields before writing this (see the `5etools-data` skill).

## 2. Mapper in `utils/info-items.ts`

```ts
export function condicionToInfoItem(c: DndEntry): InfoItem {
  return { id: itemId(c), name: c.name, source: c.source, summary: '', entries: c.entries ?? [], data: c };
}
```

`InfoItem` fields drive the UI: `summary` is the line under the name, `category` feeds the category filter, `badges` are chips, `entries` is rendered through `EntryProcessorService`. `source` always feeds the source filter. Search matches `name` only.

## 3. Component

`src/app/<pagina>/<pagina>.ts` and `.html`, copied from `objetos`:

```ts
@Component({ selector: 'app-condiciones', imports: [InfoListComponent], templateUrl: './condiciones.html' })
export class Condiciones implements OnInit {
  items: InfoItem[] = [];
  loading = true;
  private readonly data = inject(DndDataService);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    try {
      this.items = (await this.data.getCondiciones()).map(condicionToInfoItem);
    } catch (error) {
      console.error('Error cargando condiciones:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }
}
```

```html
<app-info-list
  titulo="Condiciones"
  descripcion="..."
  categoriaEtiqueta="Tipo"
  placeholder="Buscar condición..."
  [items]="items"
  [loading]="loading"
></app-info-list>
```

Keep the `try/catch/finally` with both `cdr` calls; data arrives after an `await` and the other pages rely on this to repaint.

## 4. Route and menu

- `src/app/app.routes.ts`: add `{ path: 'condiciones', component: Condiciones }` **above** `{ path: ':nombre', ... }`. That route captures any single segment, so a page declared after it opens the imported-character view instead.
- `src/app/menu/menu.ts`: add the entry to `items`.
- `app.routes.server.ts` needs no change: the page falls under `**` and is prerendered. That works because `JsonReader` only needs `fetch`; do not touch `window`, `document` or storage in the page without guarding.

## 5. Verify

```bash
npm start   # then open http://localhost:4200/condiciones
npm run build
```

Check that the list fills, search and both filters work, a card expands with formatted text, and the source filter shows only allowed books. The build confirms prerendering and the 8 kB component style budget.
