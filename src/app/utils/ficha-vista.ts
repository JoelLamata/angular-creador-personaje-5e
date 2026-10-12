/**
 * Funciones puras que preparan los datos de la ficha para mostrarlos (equipo, hechizos por nivel
 * y espacios de conjuro). Están separadas del componente para poder probarlas sin montarlo.
 */

export interface ElementoEquipo {
  nombre: string;
  cantidad: number;
}

/** `"2× Dagger"` -> `{ nombre: 'Dagger', cantidad: 2 }`; un nombre sin cantidad vale 1. */
export function separarCantidad(texto: string): ElementoEquipo {
  const m = /^(\d+)\s*[×x]\s*(.+)$/i.exec(texto.trim());
  return m ? { nombre: m[2].trim(), cantidad: Number(m[1]) } : { nombre: texto.trim(), cantidad: 1 };
}

/**
 * Convierte la lista de equipo en objetos con cantidad y suma los repetidos (el mismo objeto del
 * equipo de la clase y del trasfondo). Mantiene el orden de la primera aparición.
 */
export function unirEquipo(textos: string[]): ElementoEquipo[] {
  const porNombre = new Map<string, ElementoEquipo>();
  for (const texto of textos) {
    const e = separarCantidad(texto);
    if (!e.nombre) continue;
    const clave = e.nombre.toLowerCase();
    const previo = porNombre.get(clave);
    if (previo) previo.cantidad += e.cantidad;
    else porNombre.set(clave, { ...e });
  }
  return [...porNombre.values()];
}

export interface GrupoNivel<T> {
  /** `null` para los elementos cuyo nivel no se conoce. */
  nivel: number | null;
  titulo: string;
  items: T[];
}

/**
 * Agrupa por nivel de hechizo (Cantrip, Level 1...) en orden ascendente; los de nivel
 * desconocido van al final. Dentro de cada grupo se ordena por nombre.
 */
export function agruparPorNivel<T>(
  items: T[],
  nivelDe: (item: T) => number | null,
  nombreDe: (item: T) => string,
): GrupoNivel<T>[] {
  const grupos = new Map<number | null, T[]>();
  for (const item of items) {
    const nivel = nivelDe(item);
    grupos.set(nivel, [...(grupos.get(nivel) ?? []), item]);
  }
  return [...grupos.entries()]
    .sort(([a], [b]) => (a ?? Infinity) - (b ?? Infinity))
    .map(([nivel, lista]) => ({
      nivel,
      titulo: nivel === null ? 'Otros' : nivel === 0 ? 'Cantrip' : `Level ${nivel}`,
      items: [...lista].sort((x, y) => nombreDe(x).localeCompare(nombreDe(y))),
    }));
}

export interface EspacioConjuro {
  nivel: number;
  cantidad: number;
}

/** `"4× nivel 1, 3× nivel 2"` -> `[{ nivel: 1, cantidad: 4 }, { nivel: 2, cantidad: 3 }]` */
export function parsearEspacios(texto: string | undefined): EspacioConjuro[] {
  return (texto ?? '')
    .split(',')
    .map((parte) => /(\d+)\s*×\s*nivel\s*(\d+)/i.exec(parte))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ cantidad: Number(m[1]), nivel: Number(m[2]) }));
}
