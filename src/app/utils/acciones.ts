/**
 * Qué puede hacer un personaje en su turno: acción, acción adicional, reacción u "otros" (cosas
 * que no gastan acción). Los datos 5etools solo traen esto de forma estructurada para las
 * acciones estándar (`actions.json`); en los rasgos hay que leerlo del texto, así que aquí vive
 * el clasificador y los cálculos de ataque de las armas. Todo son funciones puras.
 */
import { ItemData } from '../models/dnd-data';
import { AbilityKey, stripTags } from './dnd-text';

export type Activacion = 'accion' | 'adicional' | 'reaccion' | 'otros';

export const ACTIVACIONES: { id: Activacion; titulo: string }[] = [
  { id: 'accion', titulo: 'Action' },
  { id: 'adicional', titulo: 'Bonus action' },
  { id: 'reaccion', titulo: 'Reactions' },
  { id: 'otros', titulo: 'Otros' },
];

/**
 * Quita de un rasgo los subrasgos que ya existen como rasgo propio. Los rasgos de cabecera de una
 * subclase (p. ej. "College of Glamour") llevan dentro el texto de sus hijos; sin esto, el hijo
 * saldría también como parte de la cabecera.
 */
export function quitarSubrasgos(entries: any[] | undefined, nombres: ReadonlySet<string>): any[] {
  const limpiar = (lista: any[]): any[] =>
    lista
      .filter((e) => !(e && typeof e === 'object' && e.name && nombres.has(e.name)))
      .map((e) => (e && typeof e === 'object' && Array.isArray(e.entries) ? { ...e, entries: limpiar(e.entries) } : e));
  return limpiar(entries ?? []);
}

// ------------------------------------------------------------ Clasificación

/** Texto de un conjunto de entradas 5etools sin etiquetas. Las tablas se ignoran (no son rasgos). */
export function textoPlano(entries: unknown): string {
  const recorrer = (e: any): string => {
    if (e === null || e === undefined) return '';
    if (typeof e === 'string') return stripTags(e);
    if (Array.isArray(e)) return e.map(recorrer).filter(Boolean).join('\n');
    if (typeof e === 'object') {
      if (e.type === 'table') return '';
      return [e.entries, e.items, e.entry].map(recorrer).filter(Boolean).join('\n');
    }
    return '';
  };
  return recorrer(entries);
}

// Las traducciones mezclan etiquetas {@variantrule Bonus Action}, "acción adicional" (2014),
// "acción extra" y textos aún en inglés, así que cada patrón admite todas las variantes.
const ADICIONAL = '(?:Bonus Action|acci[oó]n adicional|acci[oó]n extra)';
const PATRONES: Record<Activacion, RegExp[]> = {
  // "Como Bonus Action...", "puedes usar una acción adicional..." (no "cuando realices una Bonus Action": eso es un añadido).
  adicional: [
    new RegExp(`\\b(?:como|as) (?:una |la |a |an )?${ADICIONAL}`, 'i'),
    new RegExp(`\\b(?:usa|usar|usando|utiliza|utilizar|utilizando|gasta|gastar|gastando|use|using|spend) (?:una|tu|a|your|an) ${ADICIONAL}`, 'i'),
    new RegExp(`\\brealic?es una ${ADICIONAL}(?: en tu turno)? para ordenar`, 'i'),
  ],
  // Se exige "tu/una/como": "su reacción" es la de una criatura aliada, no la del personaje.
  reaccion: [
    /\b(?:como|as|tu|una|your|a|la|esa|su propia) (?:Reaction|reacci[oó]n)\b/i,
    /\b(?:usar|utilizar|usando|using|use|take|spend|gastar|realizar|realices) (?:tu |una |a |your )?(?:Reaction|reacci[oó]n)\b/i,
  ],
  accion: [
    /\bcomo (?:una )?acci[oó]n(?! adicional| extra)/i,
    /\b(?:realiz\w+|usar|utiliz\w+) una acci[oó]n Magic\b/i,
    /\bMagic action\b/i,
    /\bas an action\b/i,
    /\b(?:usando|utilizando|mediante|usa|usar|utiliza|utilizar|gastando|gastar|use|using|spend|take|takes) (?:una|tu|your|an|a) acci[oó]n(?! adicional| extra)/i,
    /\b(?:use|using|take|spend) (?:your|an|a) action\b/i,
    // Opciones de la acción Attack: Breath Weapon, War Magic...
    /\breplace one of your attacks with\b/i,
    /\bsustituir (?:uno|dos) de los ataques por\b/i,
  ],
  otros: [
    /sin necesidad de realizar (?:una|ninguna) acci[oó]n/i,
    /sin (?:usar|gastar|utilizar|realizar) (?:una |ninguna )?acci[oó]n/i,
    /no (?:requiere|cuesta|consume|necesitas|usa) (?:una )?acci[oó]n/i,
    /(?:without|no) (?:using|spending|taking|requiring|needing) (?:an )?action/i,
    /free action/i,
    /acci[oó]n gratuita/i,
    /no action (?:required|is required)/i,
  ],
};

/**
 * Casos que el texto no resuelve: la clase de rasgo se fija a mano. Una lista vacía significa que
 * no es una acción. La clave es el nombre del rasgo.
 */
const EXCEPCIONES: Record<string, Activacion[]> = {
  // "Una acción adicional" aquí es una acción más, que no gasta la del turno.
  'Action Surge': ['otros'],
  // Menciona la Reaction solo para decir qué hechizos no puede lanzar.
  'Divine Intervention': ['accion'],
  // Cita "una acción, una Bonus Action o una Reaction" como momentos, no como uso.
  'Agile Strikes': [],
  // Dice que no se puede usar otra Reaction mientras está activo.
  'Spreading Spores': ['adicional'],
};

export interface AnalisisRasgo {
  /** Clases de activación, en el orden acción, adicional, reacción, otros. Vacío = rasgo pasivo. */
  activaciones: Activacion[];
  /** Frase del texto que explica cada activación (la primera que la cumple). */
  frases: Partial<Record<Activacion, string>>;
}

/**
 * Clases de activación de un rasgo según su texto. Se mira frase a frase: un rasgo puede aparecer
 * en varias (p. ej. se activa como acción adicional y recupera usos sin acción).
 */
export function analizarRasgo(nombre: string, entries: unknown): AnalisisRasgo {
  const frases = textoPlano(entries)
    .split(/(?<=[.!?:])\s+|\n+/)
    .map((f) => f.trim())
    .filter(Boolean);
  const encontradas: Partial<Record<Activacion, string>> = {};
  for (const a of Object.keys(PATRONES) as Activacion[]) {
    const frase = frases.find((f) => PATRONES[a].some((patron) => patron.test(f)));
    if (frase) encontradas[a] = frase;
  }
  if (nombre in EXCEPCIONES) {
    // Con la clase fijada a mano no hay frase propia: se enseña la primera del rasgo.
    const activaciones = EXCEPCIONES[nombre];
    return { activaciones, frases: Object.fromEntries(activaciones.map((a) => [a, encontradas[a] ?? frases[0] ?? ''])) };
  }
  return { activaciones: (Object.keys(encontradas) as Activacion[]), frases: encontradas };
}

export function activacionesDe(nombre: string, entries: unknown): Activacion[] {
  return analizarRasgo(nombre, entries).activaciones;
}

/** Recorta una frase a un largo cómodo para una línea de resumen, sin cortar palabras. */
export function resumirFrase(frase: string, maximo = 150): string {
  if (frase.length <= maximo) return frase;
  const corte = frase.lastIndexOf(' ', maximo);
  return `${frase.slice(0, corte > 40 ? corte : maximo).replace(/[,;:\s]+$/, '')}…`;
}

/**
 * Nivel de personaje a partir del cual se tiene un rasgo cuando el propio texto lo dice
 * ("When you reach character level 3...", "Starting at 5th level..."). Sirve para los rasgos de
 * especie, que no tienen un campo de nivel.
 */
export function nivelMinimoDeTexto(entries: unknown): number {
  const texto = textoPlano(entries);
  const patrones = [
    /character level (\d+)/i,
    /nivel de personaje (\d+)/i,
    /(?:starting|beginning) (?:at|when you reach) (?:character )?level (\d+)/i,
    /(?:starting|beginning) at (\d+)(?:st|nd|rd|th) level/i,
    /(?:alcanzar|llegar a|alcances) (?:el )?nivel (\d+)/i,
    /a partir del nivel (\d+)/i,
  ];
  const niveles = patrones.map((p) => p.exec(texto)).filter((m): m is RegExpExecArray => !!m).map((m) => Number(m[1]));
  return niveles.length ? Math.min(...niveles) : 1;
}

// ------------------------------------------------------------------ Armas

const PROPIEDADES: Record<string, string> = {
  A: 'Ammunition',
  F: 'Finesse',
  H: 'Heavy',
  L: 'Light',
  LD: 'Loading',
  R: 'Reach',
  RLD: 'Reload',
  S: 'Special',
  T: 'Thrown',
  '2H': 'Two-Handed',
  V: 'Versatile',
};

const TIPOS_DANO: Record<string, string> = {
  A: 'acid', B: 'bludgeoning', C: 'cold', F: 'fire', O: 'force', L: 'lightning', N: 'necrotic',
  P: 'piercing', I: 'poison', Y: 'psychic', R: 'radiant', S: 'slashing', T: 'thunder',
};

const codigo = (texto: string) => texto.split('|')[0];

export function esArma(item: ItemData): boolean {
  return !!item['weaponCategory'] && !!item['dmg1'];
}

export function propiedadesArma(item: ItemData): string[] {
  return ((item['property'] ?? []) as string[]).map(codigo);
}

export function nombresPropiedades(item: ItemData): string[] {
  return propiedadesArma(item).map((p) => PROPIEDADES[p] ?? p);
}

export function esCuerpoACuerpo(item: ItemData): boolean {
  return codigo(item.type ?? '') === 'M';
}

export function esLigera(item: ItemData): boolean {
  return propiedadesArma(item).includes('L');
}

/** Característica del ataque: Fuerza (cuerpo a cuerpo), Destreza (distancia) o la mejor si es sutil. */
export function caracteristicaArma(item: ItemData, mods: Record<AbilityKey, number>): AbilityKey {
  if (propiedadesArma(item).includes('F')) return mods.dex > mods.str ? 'dex' : 'str';
  return esCuerpoACuerpo(item) ? 'str' : 'dex';
}

/**
 * ¿Tiene el personaje competencia con el arma? Las competencias son la lista de la clase y las
 * dotes: "Simple", "Martial", "Martial weapons that have the Finesse or Light property" o el
 * nombre de un arma concreta.
 */
export function competenteConArma(item: ItemData, competencias: string[]): boolean {
  const categoria = String(item['weaponCategory'] ?? '').toLowerCase();
  const props = nombresPropiedades(item).map((p) => p.toLowerCase());
  return competencias.some((c) => {
    const t = stripTags(c).trim().toLowerCase();
    if (t === 'simple' || t === 'martial') return t === categoria;
    const restringida = /^martial weapons that have the (.+?) propert/.exec(t);
    if (restringida) {
      const necesarias = restringida[1].split(/\s+or\s+|\s+and\s+|,\s*/).map((p) => p.trim());
      return categoria === 'martial' && necesarias.some((p) => props.includes(p));
    }
    return t === String(item.name).toLowerCase();
  });
}

export interface AtaqueArma {
  /** Bonificador a la tirada de ataque. */
  ataque: number;
  /** Daño con el modificador ya sumado: `1d8+3`. */
  dano: string;
  /** Daño a dos manos (propiedad Versatile), si la tiene. */
  danoVersatil: string | null;
  tipoDano: string;
  caracteristica: AbilityKey;
  competente: boolean;
}

const conMod = (dado: string, mod: number) => (mod === 0 ? dado : `${dado}${mod > 0 ? '+' : ''}${mod}`);

export function ataqueArma(
  item: ItemData,
  mods: Record<AbilityKey, number>,
  bonusCompetencia: number,
  competencias: string[],
): AtaqueArma {
  const caracteristica = caracteristicaArma(item, mods);
  const competente = competenteConArma(item, competencias);
  const mod = mods[caracteristica];
  const versatil = propiedadesArma(item).includes('V') && item['dmg2'];
  return {
    ataque: mod + (competente ? bonusCompetencia : 0),
    dano: conMod(String(item['dmg1']), mod),
    danoVersatil: versatil ? conMod(String(item['dmg2']), mod) : null,
    tipoDano: TIPOS_DANO[String(item['dmgType'])] ?? '',
    caracteristica,
    competente,
  };
}

/** Maestría de un arma (`"Sap|XPHB"` -> `Sap`), si las reglas 2024 se la dan. */
export function maestriaDe(item: ItemData): string | null {
  const m = ((item['mastery'] ?? []) as string[])[0];
  return m ? codigo(m) : null;
}

// --------------------------------------------------------- Rasgos opcionales

const TIPOS_OPCIONALES: Record<string, string> = {
  AI: 'Infusion',
  AS: 'Arcane Shot',
  ED: 'Elemental Discipline',
  EI: 'Invocation',
  FS: 'Fighting Style',
  MM: 'Metamagic',
  MV: 'Maneuver',
  OTH: 'Option',
  PB: 'Pact Boon',
  RN: 'Rune',
};

/** Nombre legible del tipo de un rasgo opcional (`MV:B` -> `Maneuver`). */
export function tipoOpcional(featureType: string[] | undefined): string {
  const base = codigo(((featureType ?? [])[0] ?? '').replace(':', '|'));
  return TIPOS_OPCIONALES[base] ?? 'Option';
}
