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

/** Nivel de un hechizo y si gana efecto al lanzarlo con un espacio de nivel superior. */
export interface InfoNivelHechizo {
  nivel: number | null;
  mejorable: boolean;
}

export interface GrupoEspacios<T> {
  nivel: number | null;
  titulo: string;
  /** Espacios de conjuro de este nivel (0 si no tiene o es un truco). */
  espacios: number;
  /** `mejora` indica un hechizo de nivel inferior que aquí se lanza con un espacio superior. */
  items: { item: T; mejora: boolean }[];
}

/**
 * Agrupa los hechizos por nivel e incluye un grupo por cada nivel con espacios, aunque no tenga
 * hechizos propios. Un hechizo que mejora con espacios superiores se repite (con `mejora`) en cada
 * nivel superior con espacios. Los trucos no usan espacios y nunca se repiten.
 */
export function agruparConEspacios<T>(
  items: T[],
  infoDe: (item: T) => InfoNivelHechizo,
  nombreDe: (item: T) => string,
  espacios: EspacioConjuro[],
): GrupoEspacios<T>[] {
  const huecos = new Map(espacios.filter((e) => e.cantidad > 0).map((e) => [e.nivel, e.cantidad]));
  const niveles = new Set<number | null>(huecos.keys());
  for (const item of items) niveles.add(infoDe(item).nivel);

  return [...niveles]
    .sort((a, b) => (a ?? Infinity) - (b ?? Infinity))
    .map((nivel) => {
      const propios = items
        .filter((i) => infoDe(i).nivel === nivel)
        .map((item) => ({ item, mejora: false }));
      const mejorados =
        nivel === null || nivel < 1 || !huecos.has(nivel)
          ? []
          : items
              .filter((i) => {
                const info = infoDe(i);
                return info.mejorable && info.nivel !== null && info.nivel >= 1 && info.nivel < nivel;
              })
              .map((item) => ({ item, mejora: true }));
      return {
        nivel,
        titulo: nivel === null ? 'Otros' : nivel === 0 ? 'Cantrip' : `Level ${nivel}`,
        espacios: nivel === null ? 0 : (huecos.get(nivel) ?? 0),
        items: [...propios, ...mejorados].sort((x, y) => nombreDe(x.item).localeCompare(nombreDe(y.item))),
      };
    });
}

/** Casillas de espacios gastados guardadas, ajustadas a la cantidad actual de espacios del nivel. */
export function normalizarCasillas(guardado: unknown, cantidad: number): boolean[] {
  const previo = Array.isArray(guardado) ? guardado : [];
  return Array.from({ length: Math.max(0, cantidad) }, (_, i) => previo[i] === true);
}

/** `['A']` -> `A`; `['A', 'B', 'C']` -> `A, B y C`. */
export function unirLista(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
