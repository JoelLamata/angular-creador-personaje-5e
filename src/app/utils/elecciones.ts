import { ClassInfo, SubclassInfo } from '../models/dnd-data';
import { AbilityKey, stripTags } from './dnd-text';

/**
 * Elecciones que los rasgos de clase y subclase piden al jugador (Expertise, estilos de
 * combate, invocaciones, mejoras de característica...). Los datos 5etools solo describen
 * algunas de forma estructurada (`featProgression`, `optionalfeatureProgression`, entradas
 * `options`); el resto se declara en el catálogo de este fichero.
 */

export type TipoEleccion =
  | 'experiencia' // Expertise en habilidades en las que ya hay competencia
  | 'competencias' // competencia en habilidades nuevas
  | 'opcion' // una opción entre varias con nombre
  | 'dote' // una dote de ciertas categorías (incluye la mejora de característica)
  | 'rasgoOpcional' // invocaciones, metamagia, maniobras...
  | 'maestria' // armas con propiedad de maestría
  | 'idiomas'
  | 'herramientas' // herramientas o instrumentos
  | 'habilidadesHerramientas' // habilidades o herramientas, a elegir entre ambas
  | 'hechizos'; // hechizos concedidos por una dote

export interface OpcionEleccion {
  valor: string;
  /** Texto del rasgo asociado a la opción, en formato de entradas 5etools. */
  descripcion?: any[];
}

export interface EleccionDef {
  /** Identifica la elección dentro de `PersonajeCreado.elecciones`. */
  clave: string;
  titulo: string;
  /** Clase o subclase que concede el rasgo. */
  origen: string;
  nivel: number;
  tipo: TipoEleccion;
  cantidad: number;
  /** Habilidades permitidas (`experiencia` y `competencias`); `null` = cualquiera. */
  de?: string[] | null;
  opciones?: OpcionEleccion[];
  /** Categorías de dote admitidas (`dote`). */
  categorias?: string[];
  /** Tipos de rasgo opcional admitidos (`rasgoOpcional`), p. ej. `MM` o `EI`. */
  tiposRasgo?: string[];
  filtroArma?: 'cuerpo' | 'sutil' | null;
  /** Origen de las herramientas (`herramientas`): una lista cerrada o una familia de objetos. */
  fuenteHerramientas?: 'lista' | 'instrumentos' | 'artesano' | 'cualquiera';
  /** Filtro de los hechizos (`hechizos`). */
  hechizo?: { nivel: number; clases?: string[]; escuelas?: string[]; ritual?: boolean };
  /** Texto del rasgo, para mostrarlo junto a la elección. */
  descripcion?: any[];
}

interface ItemCatalogo {
  tipo: TipoEleccion;
  cantidad?: number;
  de?: string[] | null;
  /** Usa la lista de habilidades que ofrece la clase en el nivel 1. */
  deClase?: boolean;
  opciones?: string[];
  /** Las opciones son las entradas con nombre del propio rasgo (Bear, Eagle, Wolf...). */
  desdeEntradas?: boolean;
  filtroArma?: 'cuerpo' | 'sutil' | null;
}

const EXPERIENCIA_2: ItemCatalogo[] = [{ tipo: 'experiencia', cantidad: 2 }];
const OPCION_ENTRADAS: ItemCatalogo[] = [{ tipo: 'opcion', cantidad: 1, desdeEntradas: true }];
const MAESTRIA_LIBRE: ItemCatalogo[] = [{ tipo: 'maestria' }];

/** Rasgos de clase con elección, por `Clase|Rasgo`. */
const CATALOGO_CLASE: Record<string, ItemCatalogo[]> = {
  'Bard|Expertise': EXPERIENCIA_2,
  'Rogue|Expertise': EXPERIENCIA_2,
  'Ranger|Expertise': EXPERIENCIA_2,
  'Wizard|Scholar': [
    {
      tipo: 'experiencia',
      cantidad: 1,
      de: ['arcana', 'history', 'investigation', 'medicine', 'nature', 'religion'],
    },
  ],
  'Barbarian|Primal Knowledge': [{ tipo: 'competencias', cantidad: 1, deClase: true }],
  'Ranger|Deft Explorer': [
    { tipo: 'experiencia', cantidad: 1 },
    { tipo: 'idiomas', cantidad: 2 },
  ],
  'Cleric|Blessed Strikes': OPCION_ENTRADAS,
  'Druid|Elemental Fury': OPCION_ENTRADAS,
  'Barbarian|Weapon Mastery': [{ tipo: 'maestria', filtroArma: 'cuerpo' }],
  'Fighter|Weapon Mastery': MAESTRIA_LIBRE,
  'Paladin|Weapon Mastery': MAESTRIA_LIBRE,
  'Ranger|Weapon Mastery': MAESTRIA_LIBRE,
  'Rogue|Weapon Mastery': [{ tipo: 'maestria', filtroArma: 'sutil' }],
};

/** Rasgos de subclase con elección, por `Clase|Subclase|Rasgo` (nombre corto de la subclase). */
const CATALOGO_SUBCLASE: Record<string, ItemCatalogo[]> = {
  'Bard|Lore|Bonus Proficiencies': [{ tipo: 'competencias', cantidad: 3, de: null }],
  'Barbarian|Wild Heart|Rage of the Wilds': OPCION_ENTRADAS,
  'Barbarian|Wild Heart|Aspect of the Wilds': OPCION_ENTRADAS,
  'Barbarian|Wild Heart|Power of the Wilds': OPCION_ENTRADAS,
  "Ranger|Hunter|Hunter's Prey": OPCION_ENTRADAS,
  'Ranger|Hunter|Defensive Tactics': OPCION_ENTRADAS,
  'Ranger|Beast Master|Primal Companion': [
    { tipo: 'opcion', cantidad: 1, opciones: ['Beast of the Land', 'Beast of the Sea', 'Beast of the Sky'] },
  ],
  'Ranger|Fey Wanderer|Otherworldly Glamour': [
    { tipo: 'competencias', cantidad: 1, de: ['deception', 'performance', 'persuasion'] },
  ],
  'Druid|Land|Circle of the Land Spells': [
    { tipo: 'opcion', cantidad: 1, opciones: ['Arid', 'Polar', 'Temperate', 'Tropical'] },
  ],
  'Sorcerer|Draconic|Elemental Affinity': [
    { tipo: 'opcion', cantidad: 1, opciones: ['Acid', 'Cold', 'Fire', 'Lightning', 'Poison'] },
  ],
};

/**
 * Total de elementos conocidos en un nivel. La progresión es una lista por nivel (`[1,3,3...]`)
 * o un mapa `{nivel: total}` que indica el total a partir de ese nivel (Metamagic `{2:2, 10:4}`).
 */
function totalConocido(progresion: unknown, nivel: number): number {
  if (Array.isArray(progresion)) return Number(progresion[nivel - 1] ?? 0);
  if (progresion && typeof progresion === 'object') {
    const niveles = Object.keys(progresion as object)
      .map(Number)
      .filter((n) => n <= nivel)
      .sort((a, b) => a - b);
    const ultimo = niveles[niveles.length - 1];
    return ultimo === undefined ? 0 : Number((progresion as Record<string, number>)[ultimo]);
  }
  return 0;
}

/** Primer nivel en el que la progresión da algún elemento. */
function primerNivel(progresion: unknown): number {
  if (Array.isArray(progresion)) return Math.max(1, progresion.findIndex((n) => n > 0) + 1);
  if (progresion && typeof progresion === 'object') {
    return Math.min(...Object.keys(progresion as object).map(Number));
  }
  return 1;
}

/** Entradas con nombre de un rasgo (cada una es una opción), sin entrar en las que ya tienen nombre. */
export function entradasConNombre(entries: any[] | undefined): OpcionEleccion[] {
  const out: OpcionEleccion[] = [];
  const visitar = (e: any) => {
    if (Array.isArray(e)) {
      e.forEach(visitar);
    } else if (e && typeof e === 'object') {
      if (e.type === 'entries' && e.name) out.push({ valor: e.name, descripcion: e.entries });
      else if (e.entries) visitar(e.entries);
    }
  };
  visitar(entries);
  return out;
}

/** Entradas `options` con referencias a otros rasgos de la clase (Divine Order, Primal Order). */
function opcionesPorReferencia(clase: ClassInfo, entries: any[] | undefined): { cantidad: number; opciones: OpcionEleccion[] } | null {
  for (const e of entries ?? []) {
    if (e?.type !== 'options' || !e.count) continue;
    const refs = (e.entries as any[]).filter((x) => x?.type === 'refClassFeature');
    if (refs.length === 0 || refs.length !== e.entries.length) continue;
    const opciones = refs.map((r) => {
      const [nombre, , , nivel] = String(r.classFeature).split('|');
      const rasgo = clase.allFeatures.find((f) => f.name === nombre && f.level === Number(nivel));
      return { valor: nombre, descripcion: rasgo?.entries };
    });
    return { cantidad: e.count, opciones };
  }
  return null;
}

function columnaTabla(clase: ClassInfo, etiqueta: string, nivel: number): number {
  for (const g of (clase.def['classTableGroups'] ?? []) as any[]) {
    const idx = (g.colLabels ?? []).findIndex((l: string) => stripTags(l).toLowerCase() === etiqueta.toLowerCase());
    if (idx >= 0) return parseInt(String(g.rows?.[nivel - 1]?.[idx]), 10) || 0;
  }
  return 0;
}

/** Todas las elecciones que corresponden a una clase, subclase y nivel. */
export function calcularElecciones(
  clase: ClassInfo,
  subclase: SubclassInfo | null,
  nivel: number,
): EleccionDef[] {
  const out: EleccionDef[] = [];
  const habilidadesClase: string[] | null =
    (clase.def['startingProficiencies']?.skills?.[0]?.choose?.from as string[] | undefined) ?? null;

  const desdeCatalogo = (
    items: ItemCatalogo[],
    origen: string,
    rasgo: { name: string; level: number; entries?: any[] },
  ) => {
    items.forEach((item, i) => {
      const base: EleccionDef = {
        clave: `${origen}|${rasgo.name}|${rasgo.level}|${i}`,
        titulo: rasgo.name,
        origen,
        nivel: rasgo.level,
        tipo: item.tipo,
        cantidad: item.cantidad ?? 1,
        descripcion: rasgo.entries,
      };
      if (item.tipo === 'experiencia' || item.tipo === 'competencias') {
        base.de = item.deClase ? habilidadesClase : (item.de ?? null);
      }
      if (item.opciones) base.opciones = item.opciones.map((valor) => ({ valor }));
      if (item.desdeEntradas) base.opciones = entradasConNombre(rasgo.entries);
      if (item.tipo === 'maestria') {
        base.cantidad = columnaTabla(clase, 'Weapon Mastery', nivel) || 2;
        base.filtroArma = item.filtroArma ?? null;
      }
      out.push(base);
    });
  };

  for (const rasgo of clase.features.filter((f) => f.level <= nivel)) {
    const origen = clase.name;
    const catalogo = CATALOGO_CLASE[`${clase.name}|${rasgo.name}`];
    if (catalogo) {
      desdeCatalogo(catalogo, origen, rasgo);
      continue;
    }
    if (rasgo.name === 'Ability Score Improvement') {
      out.push({
        clave: `${origen}|${rasgo.name}|${rasgo.level}|0`,
        titulo: 'Ability Score Improvement',
        origen,
        nivel: rasgo.level,
        tipo: 'dote',
        cantidad: 1,
        categorias: ['G'],
        descripcion: rasgo.entries,
      });
      continue;
    }
    const porReferencia = opcionesPorReferencia(clase, rasgo.entries);
    if (porReferencia) {
      out.push({
        clave: `${origen}|${rasgo.name}|${rasgo.level}|0`,
        titulo: rasgo.name,
        origen,
        nivel: rasgo.level,
        tipo: 'opcion',
        cantidad: porReferencia.cantidad,
        opciones: porReferencia.opciones,
        descripcion: rasgo.entries,
      });
    }
  }

  // Dotes que concede la clase por progresión: estilos de combate y dones épicos.
  for (const prog of (clase.def['featProgression'] ?? []) as any[]) {
    for (const [nivelRasgo, cantidad] of Object.entries(prog.progression as Record<string, number>)) {
      if (Number(nivelRasgo) > nivel) continue;
      for (let i = 0; i < cantidad; i++) {
        out.push({
          clave: `${clase.name}|${prog.name}|${nivelRasgo}|${i}`,
          titulo: prog.name,
          origen: clase.name,
          nivel: Number(nivelRasgo),
          tipo: 'dote',
          cantidad: 1,
          categorias: prog.category,
        });
      }
    }
  }

  const rasgosOpcionales = (progresiones: any[] | undefined, origen: string) => {
    for (const prog of progresiones ?? []) {
      const cantidad = totalConocido(prog.progression, nivel);
      if (cantidad <= 0) continue;
      out.push({
        clave: `${origen}|${prog.name}|${primerNivel(prog.progression)}|0`,
        titulo: prog.name,
        origen,
        nivel: primerNivel(prog.progression),
        tipo: 'rasgoOpcional',
        cantidad,
        tiposRasgo: prog.featureType,
      });
    }
  };
  rasgosOpcionales(clase.def['optionalfeatureProgression'], clase.name);

  if (subclase) {
    const origen = `${clase.name}|${subclase.shortName}`;
    for (const rasgo of subclase.allFeatures.filter((f) => f.level <= nivel)) {
      const catalogo = CATALOGO_SUBCLASE[`${origen}|${rasgo.name}`];
      if (catalogo) desdeCatalogo(catalogo, origen, rasgo);
    }
    rasgosOpcionales(subclase.optionalfeatureProgression, origen);
  }

  return out.sort((a, b) => a.nivel - b.nivel);
}

/** Descartar las elecciones guardadas que ya no existen (otro nivel, clase o subclase). */
export function filtrarEleccionesVigentes(
  elecciones: Record<string, string[]>,
  defs: EleccionDef[],
): Record<string, string[]> {
  const vigentes = new Set(defs.map((d) => d.clave));
  return Object.fromEntries(Object.entries(elecciones).filter(([clave]) => vigentes.has(clave)));
}

/* ------------------------------------------------------------------ Dotes */

/** Una forma de repartir la mejora de característica que concede una dote. */
export interface AlternativaMejora {
  /** Aumentos fijos, p. ej. Actor `{cha: 1}`. */
  fijo: Partial<Record<AbilityKey, number>>;
  /** Aumentos a elegir: `cantidad` características de `de`, sumando `incremento` a cada una. */
  elegir?: { de: AbilityKey[]; cantidad: number; incremento: number };
  /** Máximo que puede alcanzar la característica (20 salvo en los dones épicos). */
  max: number;
}

export function alternativasMejora(feat: Record<string, any> | undefined): AlternativaMejora[] {
  return (feat?.['ability'] ?? []).map((a: any) => {
    const max = a.max ?? 20;
    const { choose, max: _max, hidden: _hidden, ...fijo } = a;
    return {
      fijo: fijo as Partial<Record<AbilityKey, number>>,
      max,
      elegir: choose
        ? { de: choose.from, cantidad: choose.count ?? 1, incremento: choose.amount ?? 1 }
        : undefined,
    };
  });
}

/**
 * Valores de una elección de dote: `[nombre, alternativa?, ...características]`.
 * La alternativa es el índice (como texto) de la mejora elegida cuando la dote da varias.
 */
export function doteCompleta(feat: Record<string, any> | undefined, valores: string[] | undefined): boolean {
  const v = valores ?? [];
  if (v.length === 0) return false;
  const alternativas = alternativasMejora(feat);
  if (alternativas.length === 0) return true;
  const alt = alternativas[Number(v[1] ?? 0)];
  if (!alt) return false;
  const elegidas = v.slice(2);
  const necesarias = alt.elegir?.cantidad ?? 0;
  return elegidas.length === necesarias && new Set(elegidas).size === elegidas.length;
}

/** Aumentos de característica que resultan de una dote elegida. */
export function mejorasDeDote(
  feat: Record<string, any> | undefined,
  valores: string[],
): { clave: AbilityKey; incremento: number; max: number }[] {
  const alt = alternativasMejora(feat)[Number(valores[1] ?? 0)];
  if (!alt) return [];
  const fijas = Object.entries(alt.fijo).map(([clave, incremento]) => ({
    clave: clave as AbilityKey,
    incremento: Number(incremento),
    max: alt.max,
  }));
  const elegidas = valores.slice(2).map((clave) => ({
    clave: clave as AbilityKey,
    incremento: alt.elegir?.incremento ?? 1,
    max: alt.max,
  }));
  return [...fijas, ...elegidas];
}

/** ¿Está completa la elección? Las dotes necesitan además los datos de la dote (ver `doteCompleta`). */
export function eleccionCompleta(def: EleccionDef, valores: string[] | undefined): boolean {
  const v = valores ?? [];
  if (def.tipo === 'dote') return v.length > 0;
  return v.length === def.cantidad;
}
