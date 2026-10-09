import { DndEntry } from '../models/dnd-data';
import { AbilityKey, ABILITY_KEYS, abilityModifier, stripTags, titleCase } from './dnd-text';

/* ------------------------------------------------------------ Equipo inicial */

export interface OpcionEquipo {
  letra: string;
  items: string[];
  /** Oro inicial en piezas de oro. */
  oro: number;
}

export interface EquipoInicial {
  opciones: OpcionEquipo[];
  /** Descripción en texto cuando los datos no traen opciones A/B/C (clases clásicas). */
  texto: string[];
}

function itemName(raw: string): string {
  return titleCase(stripTags(raw.split('|')[0]));
}

function equipmentEntryText(e: any): string | null {
  if (typeof e === 'string') return itemName(e);
  if (e?.item) {
    const name = itemName(typeof e.item === 'string' ? e.item : (e.item.name ?? ''));
    return e.quantity > 1 ? `${e.quantity}× ${name}` : name;
  }
  if (e?.special) return e.special;
  if (e?.equipmentType) return `${e.quantity ?? 1}× (${e.equipmentType})`;
  return null;
}

/** Interpreta `startingEquipment` de una clase o `startingEquipment[0]` de un trasfondo. */
export function opcionesEquipo(startingEquipment: any): EquipoInicial {
  const result: EquipoInicial = { opciones: [], texto: [] };
  if (!startingEquipment) return result;

  const groups: any[] = Array.isArray(startingEquipment)
    ? startingEquipment
    : (startingEquipment.defaultData ?? []);

  const lettered = groups.find((g) => g && Object.keys(g).some((k) => /^[A-Z]$/.test(k)));
  if (lettered) {
    for (const [letra, entries] of Object.entries(lettered)) {
      if (!/^[A-Z]$/.test(letra) || !Array.isArray(entries)) continue;
      let oro = 0;
      const items: string[] = [];
      for (const e of entries as any[]) {
        if (e && typeof e === 'object' && 'value' in e && !e.item) {
          oro += e.value / 100;
        } else {
          const t = equipmentEntryText(e);
          if (t) items.push(t);
        }
      }
      result.opciones.push({ letra, items, oro });
    }
  } else if (!Array.isArray(startingEquipment) && startingEquipment.default) {
    result.texto = (startingEquipment.default as string[]).map((t) => stripTags(t));
  }
  return result;
}

/* ------------------------------------------------------------- Lanzamiento */

export interface InfoLanzamiento {
  habilidad: AbilityKey | null;
  trucos: number;
  preparados: number;
  nivelMaximo: number;
  espacios: string;
}

function evaluarFormula(formula: string, nivel: number, mods: Record<AbilityKey, number>): number {
  const m = /^<\$level\$>(?:\s*\/\s*(\d+))?(?:\s*\+\s*<\$(\w+)_mod\$>)?$/.exec(formula.trim());
  if (!m) return 0;
  const base = m[1] ? Math.floor(nivel / Number(m[1])) : nivel;
  const mod = m[2] ? (mods[m[2] as AbilityKey] ?? 0) : 0;
  return Math.max(1, base + mod);
}

export function infoLanzamiento(
  classDef: DndEntry,
  nivel: number,
  mods: Record<AbilityKey, number>,
): InfoLanzamiento | null {
  const habilidad = (classDef['spellcastingAbility'] ?? null) as AbilityKey | null;
  if (!habilidad && !classDef['casterProgression']) return null;

  const i = nivel - 1;
  const trucos = classDef['cantripProgression']?.[i] ?? 0;
  let preparados =
    classDef['preparedSpellsProgression']?.[i] ?? classDef['spellsKnownProgression']?.[i] ?? 0;
  if (!preparados && classDef['preparedSpells']) {
    preparados = evaluarFormula(classDef['preparedSpells'], nivel, mods);
  }

  const groups: any[] = classDef['classTableGroups'] ?? [];
  let nivelMaximo = 0;
  let espacios = '';
  const slotGroup = groups.find((g) => g.rowsSpellProgression);
  if (slotGroup) {
    const row: number[] = slotGroup.rowsSpellProgression[i] ?? [];
    nivelMaximo = row.reduce((max, n, idx) => (n > 0 ? idx + 1 : max), 0);
    espacios = row
      .map((n, idx) => (n > 0 ? `${n}× nivel ${idx + 1}` : ''))
      .filter(Boolean)
      .join(', ');
  } else {
    // Magia de pacto: columnas "Spell Slots" y "Slot Level".
    for (const g of groups) {
      const labels: string[] = (g.colLabels ?? []).map((l: string) => stripTags(l).toLowerCase());
      const slots = labels.findIndex((l) => l.includes('spell slots'));
      const lvl = labels.findIndex((l) => l.includes('slot level'));
      if (slots >= 0 && lvl >= 0 && g.rows?.[i]) {
        nivelMaximo = parseInt(String(g.rows[i][lvl]), 10) || 0;
        espacios = `${g.rows[i][slots]}× nivel ${nivelMaximo}`;
      }
    }
  }
  return { habilidad, trucos, preparados, nivelMaximo, espacios };
}

/* ------------------------------------------------ Puntuaciones de característica */

export const ARRAY_ESTANDAR = [15, 14, 13, 12, 10, 8];

export const COSTE_COMPRA: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9,
};

export const PUNTOS_COMPRA = 27;

export function costeCompra(puntuaciones: Record<AbilityKey, number>): number {
  return ABILITY_KEYS.reduce((sum, k) => sum + (COSTE_COMPRA[puntuaciones[k]] ?? 99), 0);
}

export function modificadores(scores: Record<AbilityKey, number>): Record<AbilityKey, number> {
  return Object.fromEntries(ABILITY_KEYS.map((k) => [k, abilityModifier(scores[k])])) as Record<AbilityKey, number>;
}

/* --------------------------------------------------------------- Trasfondo */

export interface OpcionBono {
  /** Valores a repartir, p. ej. [2, 1] o [1, 1, 1]. */
  pesos: number[];
  /** Características elegibles. */
  entre: AbilityKey[];
}

/** Opciones de bonificación del trasfondo (2024: +2/+1 o +1/+1/+1). */
export function opcionesBonoTrasfondo(bg: DndEntry): OpcionBono[] {
  const result: OpcionBono[] = [];
  for (const a of (bg['ability'] ?? []) as any[]) {
    const w = a.choose?.weighted;
    if (w) result.push({ pesos: w.weights, entre: w.from });
  }
  return result;
}

/** Nombres de dotes de un trasfondo: "magic initiate; cleric|xphb" -> "Magic Initiate (Cleric)". */
export function dotesDeTrasfondo(bg: DndEntry): string[] {
  const out: string[] = [];
  for (const group of (bg['feats'] ?? []) as any[]) {
    for (const key of Object.keys(group)) {
      const [name, variant] = key.split('|')[0].split(';').map((s) => s.trim());
      out.push(titleCase(variant ? `${name} (${variant})` : name));
    }
  }
  return out;
}

export function habilidadesFijas(list: any[] | undefined): string[] {
  const out: string[] = [];
  for (const group of list ?? []) {
    for (const [k, v] of Object.entries(group)) if (v === true) out.push(k);
  }
  return out;
}

/** Elecciones de habilidades pendientes: { from, count } o "cualquiera". */
export interface EleccionHabilidad {
  from: string[] | null;
  count: number;
}

export function eleccionesHabilidad(list: any[] | undefined): EleccionHabilidad[] {
  const out: EleccionHabilidad[] = [];
  for (const group of list ?? []) {
    if (group.choose) out.push({ from: group.choose.from, count: group.choose.count ?? 1 });
    if (group.any) out.push({ from: null, count: group.any });
  }
  return out;
}
