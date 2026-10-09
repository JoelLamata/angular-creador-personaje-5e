import { InfoItem } from '../components/info-card/info-card.component';
import { DndEntry, ItemData, RaceInfo } from '../models/dnd-data';
import { DndDataService } from '../services/dnd-data.service';
import { formatSizes, formatSpeed, stripTags, titleCase } from './dnd-text';

export const FEAT_CATEGORIES: Record<string, string> = {
  G: 'General Feat',
  O: 'Origin Feat',
  FS: 'Fighting Style',
  'FS:P': 'Fighting Style (Paladin)',
  'FS:R': 'Fighting Style (Ranger)',
  EB: 'Epic Boon',
};

const ABILITY_LONG: Record<string, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export function itemId(e: { name: string; source: string }): string {
  return `${e.name}|${e.source}`;
}

/** Nombres de las habilidades (o herramientas) marcadas a `true` en una lista 5etools. */
export function proficiencyNames(list: any[] | undefined): string[] {
  const out: string[] = [];
  for (const group of list ?? []) {
    for (const [k, v] of Object.entries(group)) {
      if (v === true) out.push(titleCase(k));
    }
  }
  return out;
}

export function raceToInfoItem(race: RaceInfo): InfoItem {
  const summaryParts = [
    formatSizes(race['size']),
    formatSpeed(race['speed']),
    race['darkvision'] ? `Darkvision ${race['darkvision']} ft.` : '',
  ].filter(Boolean);

  const entries: any[] = [...(race.entries ?? [])];
  if (race.versions.length) {
    entries.push({
      type: 'entries',
      name: 'Lineages',
      entries: [{ type: 'list', items: race.versions }],
    });
  }
  for (const sub of race.subraces) {
    entries.push({ type: 'entries', name: sub.name, entries: sub.entries ?? [] });
  }

  return {
    id: itemId(race),
    name: race.name,
    source: race.source,
    summary: summaryParts.join(' · '),
    category: formatSizes(race['size']) || undefined,
    badges: (race['creatureTypes'] ?? []).map((t: string) => titleCase(t)),
    entries,
    data: race,
  };
}

export function backgroundToInfoItem(bg: DndEntry): InfoItem {
  const skills = proficiencyNames(bg['skillProficiencies']);
  const tools = proficiencyNames(bg['toolProficiencies']);
  const summary = [
    skills.length ? `Skills: ${skills.join(', ')}` : '',
    tools.length ? `Tools: ${tools.join(', ')}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    id: itemId(bg),
    name: bg.name,
    source: bg.source,
    summary,
    entries: bg.entries ?? [],
    data: bg,
  };
}

export function prerequisiteText(prereq: any[] | undefined): string {
  if (!prereq?.length) return '';
  const parts: string[] = [];
  for (const group of prereq) {
    const p: string[] = [];
    if (group.level !== undefined) {
      p.push(`Level ${typeof group.level === 'object' ? group.level.level : group.level}+`);
    }
    for (const a of group.ability ?? []) {
      p.push(
        Object.entries(a)
          .map(([k, v]) => `${ABILITY_LONG[k] ?? k} ${v}+`)
          .join(' or '),
      );
    }
    if (group.spellcasting || group.spellcasting2020) p.push('Spellcasting');
    if (group.spell) p.push(`Spell: ${group.spell.map((s: string) => DndDataService.cleanName(s.replace(/#.*$/, ''))).join(' or ')}`);
    if (group.pact) p.push(`Pact of the ${group.pact}`);
    if (group.patron) p.push(`${group.patron} patron`);
    if (group.optionalfeature) {
      p.push(group.optionalfeature.map((o: string) => DndDataService.cleanName(o)).join(' or '));
    }
    if (group.item) p.push(group.item.map((i: string) => DndDataService.cleanName(i)).join(' or '));
    if (group.race) p.push(group.race.map((r: any) => titleCase(r.name)).join(' or '));
    if (group.feat) p.push(group.feat.map((f: string) => DndDataService.cleanName(f)).join(' or '));
    if (group.proficiency) p.push('Proficiency');
    if (group.other) p.push(stripTags(group.other));
    if (p.length) parts.push(p.join(', '));
  }
  return parts.join('; ');
}

export function featToInfoItem(feat: DndEntry): InfoItem {
  const category = feat['category'] ? (FEAT_CATEGORIES[feat['category']] ?? feat['category']) : 'Feat';
  const prereq = prerequisiteText(feat['prerequisite']);
  const abilityBonus = (feat['ability'] ?? [])
    .map((a: any) => {
      if (a.choose) return `+${a.choose.amount ?? 1} ${a.choose.from.map((k: string) => ABILITY_LONG[k]).join('/')}`;
      return Object.entries(a)
        .map(([k, v]) => `+${v} ${ABILITY_LONG[k] ?? k}`)
        .join(', ');
    })
    .join('; ');

  return {
    id: itemId(feat),
    name: feat.name,
    source: feat.source,
    summary: [prereq ? `Prerequisite: ${prereq}` : '', abilityBonus].filter(Boolean).join(' · '),
    category,
    entries: feat.entries ?? [],
    data: feat,
  };
}

/** Nivel mínimo que exige un rasgo opcional o una dote (0 si no exige ninguno). */
export function nivelRequerido(prereq: any[] | undefined): number {
  const niveles = (prereq ?? [])
    .filter((g) => g.level !== undefined)
    .map((g) => (typeof g.level === 'object' ? g.level.level : g.level) as number);
  return niveles.length ? Math.min(...niveles) : 0;
}

export function rasgoOpcionalToInfoItem(o: DndEntry): InfoItem {
  const prereq = prerequisiteText(o['prerequisite']);
  return {
    id: itemId(o),
    name: o.name,
    source: o.source,
    summary: prereq ? `Prerequisite: ${prereq}` : '',
    entries: o.entries ?? [],
    data: o,
  };
}

export function itemToInfoItem(item: ItemData, data: DndDataService): InfoItem {
  const type = data.itemTypeName(item) || 'Other';
  return {
    id: itemId(item),
    name: item.name,
    source: item.source,
    summary: data.itemSummary(item),
    category: type,
    badges: item.rarity && item.rarity !== 'none' ? [titleCase(item.rarity)] : [],
    entries: item.entries?.length
      ? item.entries
      : item['dmg1']
        ? [`Damage: ${item['dmg1']}`]
        : [],
    data: item,
  };
}
