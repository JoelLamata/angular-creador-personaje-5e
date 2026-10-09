import { AbilityKey } from '../utils/dnd-text';

/** Entrada genérica de los JSON en formato 5etools. */
export interface DndEntry {
  name: string;
  source: string;
  page?: number;
  entries?: any[];
  [key: string]: any;
}

export interface ClassFeatureData extends DndEntry {
  className: string;
  classSource: string;
  level: number;
}

export interface SubclassFeatureData extends ClassFeatureData {
  subclassShortName: string;
  subclassSource: string;
  header?: number;
}

export interface SubclassInfo {
  name: string;
  shortName: string;
  source: string;
  /** Características ya con las referencias `refSubclassFeature` resueltas, ordenadas por nivel. */
  features: SubclassFeatureData[];
  /** Todos los rasgos de la subclase, incluidos los que se muestran dentro de otro rasgo. */
  allFeatures: SubclassFeatureData[];
  additionalSpells?: any[];
  spellcastingAbility?: AbilityKey;
  /** Rasgos opcionales que concede la subclase (maniobras, runas...). */
  optionalfeatureProgression?: any[];
}

export interface ClassInfo {
  name: string;
  source: string;
  def: DndEntry;
  hitDie: number;
  features: ClassFeatureData[];
  /** Todas las características de la clase, incluidas las que solo se citan desde otras. */
  allFeatures: ClassFeatureData[];
  subclasses: SubclassInfo[];
  /** Nivel en el que se elige subclase (3 en la mayoría). */
  subclassLevel: number;
  subclassTitle: string;
}

export interface RaceInfo extends DndEntry {
  /** Nombre a mostrar (incluye la especie base para las subrazas). */
  displayName: string;
  /** Nombres de linajes/versiones elegibles (`_versions`). */
  versions: string[];
  subraces: DndEntry[];
}

export interface SpellData extends DndEntry {
  level: number;
  school: string;
}

export interface ItemData extends DndEntry {
  type?: string;
  rarity?: string;
  weight?: number;
  /** Valor en monedas de cobre. */
  value?: number;
}
