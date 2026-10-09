export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type AbilityKey = (typeof ABILITY_KEYS)[number];

export const ABILITY_NAMES: Record<AbilityKey, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

export const ABILITY_SHORT: Record<AbilityKey, string> = {
  str: 'STR',
  dex: 'DEX',
  con: 'CON',
  int: 'INT',
  wis: 'WIS',
  cha: 'CHA',
};

export const SIZE_NAMES: Record<string, string> = {
  T: 'Tiny',
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  H: 'Huge',
  G: 'Gargantuan',
  V: 'Varies',
};

/** Habilidad -> característica asociada (reglas 5e). */
export const SKILL_ABILITY: Record<string, AbilityKey> = {
  acrobatics: 'dex',
  'animal handling': 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  'sleight of hand': 'dex',
  stealth: 'dex',
  survival: 'wis',
};

export const SKILLS: string[] = Object.keys(SKILL_ABILITY);

/** Convierte las etiquetas 5etools `{@tag a|b|c}` en texto plano. */
export function stripTags(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text).replace(/\{@(\w+)\s*([^}]*)\}/g, (_m, tag: string, value: string) =>
    tagDisplay(tag, value),
  );
}

/** Etiquetas cuyo segundo/tercer campo no es texto visible (filtros, enlaces, dados...). */
const TAGS_WITHOUT_DISPLAY_TEXT = new Set([
  'filter', 'link', '5etools', 'footnote', 'homebrew', 'book', 'adventure',
  'dice', 'damage', 'chance', 'd20', 'hit', 'dc', 'recharge', 'atk', 'h',
]);

/** Texto visible de una etiqueta 5etools: el tercer campo si existe, si no el primero. */
export function tagDisplay(tag: string, value: string): string {
  const parts = value.split('|');
  if (tag === 'scaledice' || tag === 'scaledamage') return (parts[parts.length - 1] ?? '').trim();
  if (parts.length >= 3 && parts[2].trim() && !TAGS_WITHOUT_DISPLAY_TEXT.has(tag)) {
    return parts[2].trim();
  }
  return (parts[0] ?? '').trim();
}

export function abilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function proficiencyBonus(level: number): number {
  return Math.ceil(level / 4) + 1;
}

export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function formatSpeed(speed: unknown): string {
  if (speed === null || speed === undefined) return '';
  if (typeof speed === 'number') return `${speed} ft.`;
  if (typeof speed === 'object') {
    const s = speed as Record<string, unknown>;
    const parts: string[] = [];
    const walk = typeof s['walk'] === 'number' ? (s['walk'] as number) : undefined;
    if (walk !== undefined) parts.push(`${walk} ft.`);
    for (const mode of ['burrow', 'climb', 'fly', 'swim']) {
      const v = s[mode];
      if (v === true) parts.push(`${mode} ${walk ?? 30} ft.`);
      else if (typeof v === 'number') parts.push(`${mode} ${v} ft.`);
    }
    return parts.join(', ');
  }
  return '';
}

export function walkSpeed(speed: unknown): number {
  if (typeof speed === 'number') return speed;
  if (speed && typeof speed === 'object' && typeof (speed as any).walk === 'number') {
    return (speed as any).walk;
  }
  return 30;
}

export function formatSizes(size: string[] | undefined): string {
  return (size ?? []).map((s) => SIZE_NAMES[s] ?? s).join(' or ');
}

export function titleCase(text: string): string {
  return text.replace(/(^|[\s(-])(\w)/g, (_m, sep: string, c: string) => sep + c.toUpperCase());
}

/** Valor mostrado de una celda de la tabla de niveles de una clase. */
export function classTableCell(cell: any): string {
  if (cell === null || cell === undefined) return '';
  if (typeof cell === 'string' || typeof cell === 'number') return stripTags(cell);
  if (cell.type === 'bonus') return formatModifier(cell.value);
  if (cell.type === 'bonusSpeed') return `${formatModifier(cell.value)} ft.`;
  if (cell.type === 'dice' && Array.isArray(cell.toRoll)) {
    return cell.toRoll.map((d: any) => `${d.number}d${d.faces}`).join(' + ');
  }
  if (cell.value !== undefined) return String(cell.value);
  return '';
}
