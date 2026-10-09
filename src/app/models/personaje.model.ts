import { ABILITY_KEYS, AbilityKey } from '../utils/dnd-text';

export type Puntuaciones = Record<AbilityKey, number>;
export type MetodoPuntuaciones = 'estandar' | 'compra' | 'manual';

export interface Referencia {
  name: string;
  source: string;
}

/** Personaje creado desde la web y guardado en Firestore. */
export interface PersonajeCreado {
  id?: string;
  nombre: string;
  /** Nombre del jugador (opcional, solo informativo). */
  jugador: string;
  clase: Referencia | null;
  nivel: number;
  subclase: (Referencia & { shortName: string }) | null;
  /** Habilidades elegidas entre las de la clase. */
  habilidadesClase: string[];
  especie: Referencia | null;
  linaje: string | null;
  tamano: string | null;
  /** Habilidades que da la especie a elegir (p. ej. Human). */
  habilidadesEspecie: string[];
  /** Dote de origen que concede la especie (p. ej. Human). */
  doteEspecie: string | null;
  trasfondo: Referencia | null;
  /** Bonificaciones de característica elegidas del trasfondo. */
  bonosTrasfondo: Puntuaciones;
  metodoPuntuaciones: MetodoPuntuaciones;
  /** Puntuaciones base antes de bonificaciones. */
  puntuacionesBase: Puntuaciones;
  /** Opción de equipo elegida de la clase y del trasfondo (A/B/C). */
  equipoClase: string | null;
  equipoTrasfondo: string | null;
  dotes: string[];
  /**
   * Elecciones de los rasgos de clase y subclase (Expertise, dotes, invocaciones...).
   * La clave identifica el rasgo (ver `EleccionDef.clave`) y el valor son las opciones elegidas.
   */
  elecciones: Record<string, string[]>;
  idiomas: string[];
  hechizos: string[];
  equipoExtra: string[];
  notas: string;
  creadoEn?: number;
  actualizadoEn?: number;
}

export function puntuacionesVacias(valor = 8): Puntuaciones {
  return Object.fromEntries(ABILITY_KEYS.map((k) => [k, valor])) as Puntuaciones;
}

export function personajeNuevo(): PersonajeCreado {
  return {
    nombre: '',
    jugador: '',
    clase: null,
    nivel: 1,
    subclase: null,
    habilidadesClase: [],
    especie: null,
    linaje: null,
    tamano: null,
    habilidadesEspecie: [],
    doteEspecie: null,
    trasfondo: null,
    bonosTrasfondo: puntuacionesVacias(0),
    metodoPuntuaciones: 'estandar',
    puntuacionesBase: puntuacionesVacias(8),
    equipoClase: null,
    equipoTrasfondo: null,
    dotes: [],
    elecciones: {},
    idiomas: [],
    hechizos: [],
    equipoExtra: [],
    notas: '',
  };
}
