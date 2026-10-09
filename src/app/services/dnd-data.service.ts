import { Injectable, inject } from '@angular/core';
import { JsonReader } from '../json-reader';
import { ALLOWED_SOURCES } from '../sourcesConfigService';
import {
  ClassFeatureData,
  ClassInfo,
  DndEntry,
  ItemData,
  RaceInfo,
  SpellData,
  SubclassFeatureData,
  SubclassInfo,
} from '../models/dnd-data';
import {
  inlineSubclassRefs,
  parseClassFeatureKey,
  parseSubclassFeatureKey,
  resolveCopies,
} from '../utils/dnd-resolver';
import { stripTags } from '../utils/dnd-text';

const isAllowed = (e: { source?: string }) => ALLOWED_SOURCES.includes(e.source ?? '');

/** Tipos de objeto 5etools -> nombre legible. */
export const ITEM_TYPE_NAMES: Record<string, string> = {
  $A: 'Art Object',
  $C: 'Coinage',
  $G: 'Gemstone',
  A: 'Ammunition',
  AF: 'Ammunition',
  AIR: 'Vehicle (Air)',
  AT: "Artisan's Tools",
  EXP: 'Explosive',
  FD: 'Food and Drink',
  G: 'Adventuring Gear',
  GS: 'Gaming Set',
  HA: 'Heavy Armor',
  INS: 'Instrument',
  LA: 'Light Armor',
  M: 'Melee Weapon',
  MA: 'Medium Armor',
  MNT: 'Mount',
  P: 'Potion',
  R: 'Ranged Weapon',
  RD: 'Rod',
  RG: 'Ring',
  S: 'Shield',
  SC: 'Scroll',
  SCF: 'Spellcasting Focus',
  SHP: 'Vehicle (Water)',
  T: 'Tool',
  TAH: 'Tack and Harness',
  TB: 'Trade Bar',
  TG: 'Trade Good',
  VEH: 'Vehicle (Land)',
  WD: 'Wand',
  OTH: 'Other',
};

/** Carga y normaliza los datos de `public/assets` para las páginas y el creador. */
@Injectable({ providedIn: 'root' })
export class DndDataService {
  private readonly jsonReader = inject(JsonReader);
  private cache = new Map<string, Promise<any>>();

  private memo<T>(key: string, loader: () => Promise<T>): Promise<T> {
    if (!this.cache.has(key)) {
      this.cache.set(key, loader());
    }
    return this.cache.get(key)! as Promise<T>;
  }

  // ---------------------------------------------------------------- Clases

  getClases(): Promise<ClassInfo[]> {
    return this.memo('clases', async () => {
      const index: Record<string, string> = await this.jsonReader.getData('class/index.json');
      const files = Object.values(index).filter(Boolean);
      const datas = await Promise.all(files.map((f) => this.jsonReader.getData(`class/${f}`)));
      return datas
        .map((d) => this.buildClass(d))
        .filter((c): c is ClassInfo => c !== null)
        .sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  private buildClass(data: any): ClassInfo | null {
    const candidates: DndEntry[] = (data.class ?? []).filter(isAllowed);
    // La versión 2024 (XPHB) tiene prioridad sobre las demás.
    const def = candidates.find((c) => c.source === 'XPHB') ?? candidates[0];
    if (!def) return null;

    const allFeatures: ClassFeatureData[] = resolveCopies<any>(
      data.classFeature ?? [],
      (b, c) => b.name === c.name && b.source === c.source && b.className === c.className,
    );
    const features: ClassFeatureData[] = [];
    for (const raw of def['classFeatures'] ?? []) {
      const key: string = typeof raw === 'string' ? raw : raw.classFeature;
      const k = parseClassFeatureKey(key);
      const feat = allFeatures.find(
        (f) =>
          f.name === k.name &&
          f.className === def['name'] &&
          f.classSource === def.source &&
          f.level === k.level,
      );
      if (feat) features.push(feat);
    }
    features.sort((a, b) => a.level - b.level);

    const subclassLevel = features.find((f) => /subclass|specialist|archetype/i.test(f.name))?.level ?? 3;

    return {
      name: def.name,
      source: def.source,
      def,
      hitDie: def['hd']?.faces ?? 8,
      features,
      allFeatures: allFeatures.filter((f) => f.className === def['name'] && f.classSource === def.source),
      subclasses: this.buildSubclasses(data, def),
      subclassLevel,
      subclassTitle: def['subclassTitle'] ?? 'Subclass',
    };
  }

  private buildSubclasses(data: any, def: DndEntry): SubclassInfo[] {
    const rawSubclasses = resolveCopies<any>(
      data.subclass ?? [],
      (b, c) =>
        b.name === c.name &&
        b.source === c.source &&
        b.className === (c.className ?? b.className) &&
        b.classSource === (c.classSource ?? b.classSource),
    );
    const rawFeatures = resolveCopies<any>(
      data.subclassFeature ?? [],
      (b, c) =>
        b.name === c.name &&
        b.source === c.source &&
        b.className === c.className &&
        b.classSource === c.classSource &&
        b.subclassShortName === c.subclassShortName &&
        b.subclassSource === c.subclassSource,
    ) as SubclassFeatureData[];

    const lookup = (key: string) => {
      const k = parseSubclassFeatureKey(key);
      const matches = rawFeatures.filter(
        (f) =>
          f.name === k.name &&
          f.className === k.className &&
          f.subclassShortName === k.subclassShortName &&
          f.subclassSource === k.subclassSource &&
          f.level === k.level,
      );
      return matches.find((f) => f.classSource === k.classSource) ?? matches[0];
    };

    const seen = new Set<string>();
    const result: SubclassInfo[] = [];
    for (const sc of rawSubclasses) {
      if (!isAllowed(sc) || sc.className !== def['name'] || sc.classSource !== def.source) continue;
      const id = `${sc.name}|${sc.source}`;
      if (seen.has(id)) continue;
      seen.add(id);

      const used = new Set<string>();
      // Todos los rasgos que se resuelven: los listados y los que solo cita otro rasgo.
      const resueltos = new Set<SubclassFeatureData>();
      const buscar = (key: string) => {
        const feat = lookup(key);
        if (feat) resueltos.add(feat);
        return feat;
      };
      const features: { key: string; feat: SubclassFeatureData }[] = [];
      for (const key of (sc.subclassFeatures ?? []) as string[]) {
        const feat = buscar(key);
        if (!feat) continue;
        features.push({
          key,
          feat: { ...feat, entries: inlineSubclassRefs(feat.entries, buscar, used) },
        });
      }
      // Las características referenciadas dentro de otra ya se muestran incluidas en ella.
      const visible = features.filter((f) => !used.has(f.key)).map((f) => f.feat);
      visible.sort((a, b) => a.level - b.level);
      const todos = [...resueltos]
        .map((f) => ({ ...f, entries: inlineSubclassRefs(f.entries, lookup, new Set<string>()) }))
        .sort((a, b) => a.level - b.level);

      result.push({
        name: sc.name,
        shortName: sc.shortName ?? sc.name,
        source: sc.source,
        features: visible,
        allFeatures: todos,
        additionalSpells: sc.additionalSpells,
        spellcastingAbility: sc.spellcastingAbility,
        optionalfeatureProgression: sc.optionalfeatureProgression,
      });
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  // --------------------------------------------------------------- Especies

  getRazas(): Promise<RaceInfo[]> {
    return this.memo('razas', async () => {
      const data = await this.jsonReader.getData('races.json');
      const razas: DndEntry[] = (data.race ?? []).filter(isAllowed);
      const subrazas: DndEntry[] = (data.subrace ?? []).filter(isAllowed);
      return razas
        .map((r) => ({
          ...r,
          displayName: r.name,
          versions: this.raceVersions(r),
          subraces: subrazas.filter((s) => s['raceName'] === r.name && s['raceSource'] === r.source),
        }))
        .sort((a, b) => a.name.localeCompare(b.name) || a.source.localeCompare(b.source));
    });
  }

  /** Nombres de los linajes/versiones que ofrece una especie (`_versions`). */
  private raceVersions(race: DndEntry): string[] {
    const names: string[] = [];
    for (const v of (race['_versions'] ?? []) as any[]) {
      if (v.name) {
        names.push(String(v.name).replace(/^.*?;\s*/, ''));
      } else if (v['_abstract'] && Array.isArray(v['_implementations'])) {
        for (const impl of v['_implementations']) {
          const vars = impl['_variables'] ?? {};
          const name = String(v['_abstract'].name ?? '').replace(
            /\{\{(\w+)\}\}/g,
            (_m, key: string) => String(vars[key] ?? ''),
          );
          if (name) names.push(name);
        }
      }
    }
    return names;
  }

  // ------------------------------------------------------------ Trasfondos

  getTrasfondos(): Promise<DndEntry[]> {
    return this.memo('trasfondos', async () => {
      const data = await this.jsonReader.getData('backgrounds.json');
      const resolved = resolveCopies<DndEntry>(
        data.background ?? [],
        (b, c) => b.name === c.name && b.source === c.source,
      );
      return resolved.filter(isAllowed).sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  // ----------------------------------------------------------------- Dotes

  getDotes(): Promise<DndEntry[]> {
    return this.memo('dotes', async () => {
      const data = await this.jsonReader.getData('feats.json');
      return (data.feat ?? ([] as DndEntry[]))
        .filter(isAllowed)
        .sort((a: DndEntry, b: DndEntry) => a.name.localeCompare(b.name));
    });
  }

  // --------------------------------------------------------------- Objetos

  getObjetos(): Promise<ItemData[]> {
    return this.memo('objetos', async () => {
      const [items, base] = await Promise.all([
        this.jsonReader.getData('items.json'),
        this.jsonReader.getData('items-base.json'),
      ]);
      const all: ItemData[] = [...(base.baseitem ?? []), ...(items.item ?? [])].filter(isAllowed);
      // Evita duplicados exactos (mismo nombre y fuente).
      const seen = new Set<string>();
      return all
        .filter((i) => {
          const k = `${i.name}|${i.source}`;
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  /** Resumen de una línea de un objeto (tipo, daño, rareza...). */
  itemSummary(item: ItemData): string {
    const parts: string[] = [];
    const type = this.itemTypeName(item);
    if (type) parts.push(type);
    if (item['dmg1']) {
      const dmgTypes: Record<string, string> = {
        S: 'slashing', P: 'piercing', B: 'bludgeoning', N: 'necrotic', R: 'radiant', F: 'fire',
      };
      parts.push(`${item['dmg1']} ${dmgTypes[item['dmgType']] ?? ''}`.trim());
    }
    if (item['ac']) parts.push(`AC ${item['ac']}`);
    if (item.rarity && item.rarity !== 'none') parts.push(item.rarity);
    if (item.value) parts.push(this.formatCost(item.value));
    if (item.weight) parts.push(`${item.weight} lb.`);
    return parts.join(' · ');
  }

  itemTypeName(item: ItemData): string {
    const code = (item.type ?? '').split('|')[0];
    if (code) return ITEM_TYPE_NAMES[code] ?? code;
    if (item['wondrous']) return 'Wondrous Item';
    return '';
  }

  /** Coste en monedas de cobre -> texto con la moneda mayor posible. */
  formatCost(cp: number): string {
    if (cp >= 100 && cp % 100 === 0) return `${cp / 100} gp`;
    if (cp >= 10 && cp % 10 === 0) return `${cp / 10} sp`;
    return `${cp} cp`;
  }

  // ------------------------------------------------- Rasgos de clase con elección

  /**
   * Rasgos opcionales (invocaciones, metamagia, maniobras...) de los tipos pedidos. Si las
   * fuentes activas no tienen ninguno de ese tipo se usan los del PHB (2014), p. ej. el estilo
   * de combate del Colegio de las Espadas.
   */
  async getRasgosOpcionales(tipos: string[]): Promise<DndEntry[]> {
    const todos: DndEntry[] = await this.memo('rasgos-opcionales', async () => {
      const data = await this.jsonReader.getData('optionalfeatures.json');
      return data.optionalfeature ?? [];
    });
    const deTipo = todos.filter((o) => ((o['featureType'] ?? []) as string[]).some((t) => tipos.includes(t)));
    let candidatos = deTipo.filter(isAllowed);
    if (candidatos.length === 0) candidatos = deTipo.filter((o) => o.source === 'PHB');

    // Un mismo rasgo en dos ediciones: se prefiere la 2024.
    const porNombre = new Map<string, DndEntry>();
    for (const o of candidatos) {
      const previo = porNombre.get(o.name);
      if (!previo || (o.source === 'XPHB' && previo.source !== 'XPHB')) porNombre.set(o.name, o);
    }
    return [...porNombre.values()].sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Armas que tienen propiedad de maestría (reglas 2024), filtradas por tipo de arma. */
  async getArmasConMaestria(filtro: 'cuerpo' | 'sutil' | null | undefined): Promise<ItemData[]> {
    const data = await this.jsonReader.getData('items-base.json');
    const armas: ItemData[] = (data.baseitem ?? []).filter(
      (i: ItemData) =>
        i.source === 'XPHB' &&
        ['simple', 'martial'].includes(i['weaponCategory']) &&
        (i['mastery'] ?? []).length > 0,
    );
    return armas
      .filter((a) => {
        if (filtro === 'cuerpo') return String(a.type ?? '').startsWith('M');
        if (filtro === 'sutil') {
          return ((a['property'] ?? []) as string[]).some((p) => ['F|XPHB', 'L|XPHB'].includes(p));
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Texto de cada propiedad de maestría (Cleave, Graze, Nick...). */
  async getDescripcionesMaestria(): Promise<Record<string, any[]>> {
    const data = await this.jsonReader.getData('items-base.json');
    return Object.fromEntries(
      ((data.itemMastery ?? []) as DndEntry[]).map((m) => [m.name, m.entries ?? []]),
    );
  }

  /** Herramientas del juego (2024), agrupadas para las dotes que dejan elegirlas. */
  getHerramientas(): Promise<{ artesano: string[]; instrumentos: string[]; todas: string[] }> {
    return this.memo('herramientas', async () => {
      const objetos = await this.getObjetos();
      const deTipo = (...codigos: string[]) =>
        objetos
          .filter((o) => o.source === 'XPHB' && codigos.includes(String(o.type ?? '').split('|')[0]))
          .map((o) => o.name.toLowerCase());
      const artesano = deTipo('AT');
      const instrumentos = deTipo('INS');
      const todas = [...new Set([...artesano, ...instrumentos, ...deTipo('GS', 'T')])].sort();
      return { artesano, instrumentos, todas };
    });
  }

  // -------------------------------------------------------------- Hechizos

  getHechizos(): Promise<SpellData[]> {
    return this.memo('hechizos', async () => {
      const all: SpellData[] = await this.jsonReader.getSpellsData();
      const allowed = all.filter(isAllowed);
      // Si un hechizo está en varias ediciones, se prefiere la 2024 (XPHB).
      const byName = new Map<string, SpellData>();
      for (const s of allowed) {
        const prev = byName.get(s.name);
        if (!prev || (s.source === 'XPHB' && prev.source !== 'XPHB')) byName.set(s.name, s);
      }
      return [...byName.values()].sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
    });
  }

  getListasHechizosPorClase(): Promise<Record<string, string[]>> {
    return this.memo('hechizos-clase', () => this.jsonReader.getData('spells/class-lists.json'));
  }

  async getHechizosDeClase(className: string): Promise<SpellData[]> {
    const [spells, lists] = await Promise.all([this.getHechizos(), this.getListasHechizosPorClase()]);
    const names = new Set(lists[className] ?? []);
    return spells.filter((s) => names.has(s.name));
  }

  // --------------------------------------------------------------- Varios

  getHabilidades(): Promise<DndEntry[]> {
    return this.memo('habilidades', async () => {
      const data = await this.jsonReader.getData('skills.json');
      return (data.skill ?? []).filter((s: DndEntry) => s.source === 'PHB' || s.source === 'XPHB');
    });
  }

  getIdiomas(): Promise<DndEntry[]> {
    return this.memo('idiomas', async () => {
      const data = await this.jsonReader.getData('languages.json');
      return (data.language ?? []).filter((l: DndEntry) => l.source === 'XPHB');
    });
  }

  /** Nombre limpio ("fireball|xphb" -> "Fireball"). */
  static cleanName(raw: string): string {
    const name = stripTags(raw.split('|')[0]);
    return name.replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
