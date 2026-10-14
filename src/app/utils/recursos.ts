/**
 * Recursos con usos limitados que un jugador lleva la cuenta en mesa: furias, inspiración de
 * bardo, usos de Canalizar divinidad, puntos de hechicería... Los datos 5etools no los describen
 * de forma estructurada (están en columnas de la tabla de la clase o en el texto), así que aquí
 * se declaran los más comunes. Todo son funciones puras.
 */
import { ClassInfo, SubclassInfo } from '../models/dnd-data';
import { Activacion } from './acciones';
import { AbilityKey, classTableCell, stripTags } from './dnd-text';

/** Qué recupera un descanso corto: nada, un uso gastado o todos. El largo siempre recupera todo. */
export type RecargaCorta = 'ninguno' | 'uno' | 'todos';

export interface Recurso {
  id: string;
  nombre: string;
  /** `usos` se muestran como casillas marcables y `puntos` como un contador (reservas grandes). */
  tipo: 'usos' | 'puntos';
  max: number;
  corto: RecargaCorta;
  /** Categoría de la pestaña Acciones en la que se usa (donde se muestra el recurso). */
  categoria: Activacion;
}

/** Estado guardado: casillas gastadas de los `usos` y puntos gastados de los `puntos`. */
export type EstadoRecursos = Record<string, boolean[] | number>;

interface Contexto {
  nivel: number;
  mods: Record<AbilityKey, number>;
  /** Valor de una columna de la tabla de la clase en el nivel del personaje (0 si no existe). */
  tabla: (columna: string) => number;
}

interface Definicion {
  clase: string;
  /** Rasgo que concede el recurso: sin él (por nivel) el recurso no existe. */
  rasgo: string;
  /** Subclase que lo concede (el rasgo se busca entonces en ella). */
  subclase?: string;
  nombre?: string;
  tipo?: 'usos' | 'puntos';
  /** Dónde se usa: un recurso se muestra una sola vez, en la categoría de su uso principal. */
  categoria: Activacion;
  max: (c: Contexto) => number;
  corto: (nivel: number) => RecargaCorta;
}

const ninguno = () => 'ninguno' as const;
const uno = () => 'uno' as const;
const todos = () => 'todos' as const;
const columna = (nombre: string) => (c: Contexto) => c.tabla(nombre);

/** Recursos de las reglas 2024 (más Flash of Genius del Artificer). */
const DEFINICIONES: Definicion[] = [
  { clase: 'Barbarian', rasgo: 'Rage', categoria: 'adicional', max: columna('Rages'), corto: uno },
  { clase: 'Bard', rasgo: 'Bardic Inspiration', categoria: 'adicional', max: (c) => Math.max(1, c.mods.cha), corto: (n) => (n >= 5 ? 'todos' : 'ninguno') },
  { clase: 'Cleric', rasgo: 'Channel Divinity', categoria: 'accion', max: columna('Channel Divinity'), corto: uno },
  { clase: 'Paladin', rasgo: 'Channel Divinity', categoria: 'accion', max: columna('Channel Divinity'), corto: uno },
  { clase: 'Druid', rasgo: 'Wild Shape', categoria: 'adicional', max: columna('Wild Shape'), corto: uno },
  { clase: 'Fighter', rasgo: 'Second Wind', categoria: 'adicional', max: columna('Second Wind'), corto: uno },
  { clase: 'Fighter', rasgo: 'Action Surge', categoria: 'otros', max: (c) => (c.nivel >= 17 ? 2 : 1), corto: todos },
  { clase: 'Fighter', rasgo: 'Combat Superiority', subclase: 'Battle Master', nombre: 'Superiority Dice', categoria: 'accion', max: (c) => (c.nivel >= 15 ? 6 : c.nivel >= 7 ? 5 : 4), corto: todos },
  { clase: 'Monk', rasgo: "Monk's Focus", nombre: 'Focus Points', tipo: 'puntos', categoria: 'adicional', max: columna('Focus Points'), corto: todos },
  { clase: 'Sorcerer', rasgo: 'Font of Magic', nombre: 'Sorcery Points', tipo: 'puntos', categoria: 'adicional', max: columna('Sorcery Points'), corto: ninguno },
  { clase: 'Sorcerer', rasgo: 'Innate Sorcery', categoria: 'adicional', max: () => 2, corto: ninguno },
  { clase: 'Paladin', rasgo: 'Lay on Hands', nombre: 'Lay on Hands (HP)', tipo: 'puntos', categoria: 'adicional', max: (c) => 5 * c.nivel, corto: ninguno },
  { clase: 'Wizard', rasgo: 'Arcane Recovery', categoria: 'otros', max: () => 1, corto: ninguno },
  { clase: 'Ranger', rasgo: 'Favored Enemy', nombre: "Hunter's Mark gratis", categoria: 'adicional', max: columna('Favored Enemy'), corto: ninguno },
  { clase: 'Artificer', rasgo: 'Flash of Genius', categoria: 'reaccion', max: (c) => Math.max(1, c.mods.int), corto: ninguno },
];

/** Valor numérico de una columna de la tabla de la clase en un nivel (0 si no hay columna o valor). */
function valorDeTabla(clase: ClassInfo, nivel: number, nombre: string): number {
  for (const grupo of (clase.def['classTableGroups'] ?? []) as any[]) {
    const i = ((grupo.colLabels ?? []) as string[]).findIndex((l) => stripTags(l).trim() === nombre);
    if (i < 0) continue;
    const valor = parseInt(classTableCell(grupo.rows?.[nivel - 1]?.[i]), 10);
    return Number.isNaN(valor) ? 0 : valor;
  }
  return 0;
}

export function recursosDe(
  clase: ClassInfo | null,
  subclase: SubclassInfo | null,
  nivel: number,
  mods: Record<AbilityKey, number>,
): Recurso[] {
  if (!clase) return [];
  const contexto: Contexto = { nivel, mods, tabla: (c) => valorDeTabla(clase, nivel, c) };
  const out: Recurso[] = [];
  for (const d of DEFINICIONES.filter((x) => x.clase === clase.name)) {
    const fuente = d.subclase ? (subclase?.shortName === d.subclase || subclase?.name === d.subclase ? subclase : null) : clase;
    if (!fuente?.allFeatures.some((f) => f.name === d.rasgo && f.level <= nivel)) continue;
    const max = d.max(contexto);
    if (max <= 0) continue;
    const nombre = d.nombre ?? d.rasgo;
    out.push({ id: nombre, nombre, tipo: d.tipo ?? 'usos', max, corto: d.corto(nivel), categoria: d.categoria });
  }
  return out;
}

/** Ajusta lo guardado a los recursos actuales: casillas con el largo justo y puntos dentro del máximo. */
export function normalizarEstado(guardado: unknown, recursos: Recurso[]): EstadoRecursos {
  const previo = (guardado && typeof guardado === 'object' ? guardado : {}) as Record<string, unknown>;
  return Object.fromEntries(
    recursos.map((r) => {
      const valor = previo[r.id];
      if (r.tipo === 'puntos') {
        return [r.id, typeof valor === 'number' ? Math.min(r.max, Math.max(0, Math.floor(valor))) : 0];
      }
      const casillas = Array.isArray(valor) ? valor : [];
      return [r.id, Array.from({ length: r.max }, (_, i) => casillas[i] === true)];
    }),
  );
}

/** Cuántos usos o puntos quedan disponibles. */
export function disponibles(recurso: Recurso, estado: EstadoRecursos): number {
  const valor = estado[recurso.id];
  return recurso.tipo === 'puntos' ? recurso.max - (typeof valor === 'number' ? valor : 0) : recurso.max - (Array.isArray(valor) ? valor.filter(Boolean).length : 0);
}

/** Estado tras un descanso: el largo lo recupera todo; el corto, lo que indique cada recurso. */
export function descansar(recursos: Recurso[], estado: EstadoRecursos, tipo: 'corto' | 'largo'): EstadoRecursos {
  const nuevo: EstadoRecursos = { ...estado };
  for (const r of recursos) {
    const valor = estado[r.id];
    if (tipo === 'largo' || r.corto === 'todos') {
      nuevo[r.id] = r.tipo === 'puntos' ? 0 : Array.from({ length: r.max }, () => false);
    } else if (r.corto === 'uno' && Array.isArray(valor)) {
      // Se libera el último uso gastado.
      const copia = [...valor];
      const ultimo = copia.lastIndexOf(true);
      if (ultimo >= 0) copia[ultimo] = false;
      nuevo[r.id] = copia;
    }
  }
  return nuevo;
}

// ---------------------------------------------------------------- Almacenamiento

/** Lo gastado se guarda solo en este dispositivo, por personaje (o `borrador` si aún no está guardado). */
const claveAlmacen = (almacen: string) => `ficha-recursos-gastados:${almacen}`;

export function leerEstado(almacen: string, recursos: Recurso[]): EstadoRecursos {
  let guardado: unknown = {};
  try {
    guardado = JSON.parse(localStorage.getItem(claveAlmacen(almacen)) ?? '{}');
  } catch {
    guardado = {};
  }
  return normalizarEstado(guardado, recursos);
}

export function guardarEstado(almacen: string, estado: EstadoRecursos): void {
  try {
    localStorage.setItem(claveAlmacen(almacen), JSON.stringify(estado));
  } catch {
    // Sin almacenamiento disponible lo marcado dura hasta salir de la ficha.
  }
}

/** Aplica un descanso a lo guardado, sin necesidad de que la pestaña de acciones esté abierta. */
export function descansarGuardado(almacen: string, recursos: Recurso[], tipo: 'corto' | 'largo'): void {
  guardarEstado(almacen, descansar(recursos, leerEstado(almacen, recursos), tipo));
}
