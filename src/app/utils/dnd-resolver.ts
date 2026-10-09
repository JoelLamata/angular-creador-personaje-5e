/**
 * Utilidades para resolver las referencias de los datos en formato 5etools:
 * `_copy` (entradas que copian a otra) y `refSubclassFeature` (entradas que
 * apuntan a otra característica de subclase).
 */

type Entry = Record<string, any>;

function applyEntriesMod(entries: any[], mod: any): any[] {
  const mods = Array.isArray(mod) ? mod : [mod];
  let result = [...entries];
  for (const m of mods) {
    if (!m || typeof m !== 'object') continue;
    const items = m.items === undefined ? [] : Array.isArray(m.items) ? m.items : [m.items];
    switch (m.mode) {
      case 'appendArr':
        result = [...result, ...items];
        break;
      case 'prependArr':
        result = [...items, ...result];
        break;
      case 'replaceArr': {
        const idx = result.findIndex((e) => e && typeof e === 'object' && e.name === m.replace);
        if (idx >= 0) result.splice(idx, 1, ...items);
        break;
      }
      case 'removeArr': {
        const names = Array.isArray(m.names) ? m.names : [m.names];
        result = result.filter((e) => !(e && typeof e === 'object' && names.includes(e.name)));
        break;
      }
    }
  }
  return result;
}

/**
 * Aplica `_copy` a cada entrada de la lista. `matches(base, copy)` decide si una
 * entrada es la base a la que apunta `copy._copy`. Si la base no está en la lista
 * se deja la entrada tal cual.
 */
export function resolveCopies<T extends Entry>(
  list: T[],
  matches: (base: T, copy: any) => boolean,
): T[] {
  const resolve = (item: T, depth = 0): T => {
    const copy = item['_copy'];
    if (!copy || depth > 5) return item;
    const base = list.find((b) => b !== item && !b['_copy'] && matches(b, copy)) ??
      list.find((b) => b !== item && matches(b, copy));
    if (!base) return item;
    const resolvedBase = resolve(base, depth + 1);
    const { _copy, _preserve, ...own } = item as Entry;
    const merged: Entry = { ...resolvedBase, ...own };
    const mod = _copy?._mod?.entries;
    if (mod && Array.isArray(merged['entries'])) {
      merged['entries'] = applyEntriesMod(merged['entries'], mod);
    }
    return merged as T;
  };
  return list.map((i) => resolve(i));
}

/** Clave `Nombre|Clase|FuenteClase|Subclase|FuenteSubclase|Nivel` -> partes. */
export function parseSubclassFeatureKey(key: string) {
  const [name, className, classSource, subShort, subSource, level] = key.split('|');
  return {
    name,
    className,
    classSource: classSource || 'PHB',
    subclassShortName: subShort,
    subclassSource: subSource || classSource || 'PHB',
    level: Number(level),
  };
}

/** Clave `Nombre|Clase|FuenteClase|Nivel` -> partes. */
export function parseClassFeatureKey(key: string) {
  const [name, className, classSource, level] = key.split('|');
  return { name, className, classSource: classSource || 'PHB', level: Number(level) };
}

/**
 * Sustituye las entradas `refSubclassFeature` por el contenido de la
 * característica a la que apuntan. `lookup` devuelve la característica o undefined.
 * Las claves resueltas se añaden a `used` para no repetirlas como característica propia.
 */
export function inlineSubclassRefs(
  entries: any[] | undefined,
  lookup: (key: string) => Entry | undefined,
  used: Set<string>,
  depth = 0,
): any[] {
  if (!entries) return [];
  const out: any[] = [];
  for (const e of entries) {
    if (e && typeof e === 'object' && e.type === 'refSubclassFeature') {
      const feat = lookup(e.subclassFeature);
      if (feat && depth < 4) {
        used.add(e.subclassFeature);
        out.push({
          type: 'entries',
          name: feat['name'],
          entries: inlineSubclassRefs(feat['entries'], lookup, used, depth + 1),
        });
      }
    } else if (e && typeof e === 'object' && Array.isArray(e.entries)) {
      out.push({ ...e, entries: inlineSubclassRefs(e.entries, lookup, used, depth + 1) });
    } else {
      out.push(e);
    }
  }
  return out;
}
