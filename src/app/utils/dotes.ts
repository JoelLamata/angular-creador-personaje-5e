import { DndEntry } from '../models/dnd-data';
import { EleccionDef } from './elecciones';
import { ABILITY_NAMES, titleCase } from './dnd-text';

/**
 * Dotes y las elecciones que conceden. Una dote puede pedir decisiones propias: Magic Initiate
 * (lista de hechizos, dos trucos, un hechizo), Skilled (tres competencias), Musician (tres
 * instrumentos), Resilient (característica), etc. Se leen de los campos estructurados del dato.
 */

export interface DoteResuelta {
  feat: DndEntry;
  /** Variante elegida, p. ej. `Cleric` en `Magic Initiate (Cleric)`. */
  variante: string | null;
  /** Nombre con la variante, tal y como se guarda en el personaje. */
  nombre: string;
}

/** Variantes de una dote: Magic Initiate trae un bloque de hechizos con nombre por cada lista. */
export function variantesDote(feat: DndEntry): string[] {
  const bloques = feat['additionalSpells'] as { name?: string }[] | undefined;
  if (!bloques || bloques.length < 2) return [];
  return bloques.map((b) => String(b.name ?? '').replace(/ Spells$/, '')).filter(Boolean);
}

export function nombreConVariante(feat: DndEntry, variante: string | null): string {
  return variante ? `${feat.name} (${variante})` : feat.name;
}

/** Nombres seleccionables de una dote: uno por variante, o el nombre sin más. */
export function nombresSeleccionables(feat: DndEntry): string[] {
  const variantes = variantesDote(feat);
  return variantes.length ? variantes.map((v) => nombreConVariante(feat, v)) : [feat.name];
}

/** Busca la dote por su nombre guardado (con o sin variante); prefiere la edición 2024. */
export function resolverDote(dotes: DndEntry[], nombre: string): DoteResuelta | undefined {
  const porNombre = (n: string) =>
    dotes.find((d) => d.name === n && d.source === 'XPHB') ?? dotes.find((d) => d.name === n);

  const exacta = porNombre(nombre);
  if (exacta && variantesDote(exacta).length === 0) return { feat: exacta, variante: null, nombre };

  const m = /^(.*) \((.+)\)$/.exec(nombre);
  if (m) {
    const base = porNombre(m[1]);
    if (base && variantesDote(base).includes(m[2])) return { feat: base, variante: m[2], nombre };
  }
  return exacta ? { feat: exacta, variante: null, nombre } : undefined;
}

/** `level=0|class=Cleric` -> `{ level: ['0'], class: ['Cleric'] }` */
function leerFiltro(texto: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const parte of texto.split('|')) {
    const [clave, valor] = parte.split('=');
    if (clave && valor !== undefined) out[clave.trim()] = valor.split(';').map((v) => v.trim());
  }
  return out;
}

/** Entradas `{choose: ..., count}` de una lista de hechizos concedidos. */
function eleccionesDeHechizos(lista: unknown): { filtro: Record<string, string[]>; cantidad: number }[] {
  const out: { filtro: Record<string, string[]>; cantidad: number }[] = [];
  for (const e of (Array.isArray(lista) ? lista : []) as any[]) {
    if (e && typeof e === 'object' && typeof e.choose === 'string') {
      out.push({ filtro: leerFiltro(e.choose), cantidad: e.count ?? 1 });
    }
  }
  return out;
}

/**
 * Elecciones que concede una dote. `slot` identifica de dónde viene (`especie`, `trasfondo` o la
 * clave de la elección de clase) para que la misma dote tomada dos veces no comparta respuestas.
 */
export function eleccionesDeDote(
  feat: DndEntry,
  variante: string | null,
  slot: string,
  origen: string,
): EleccionDef[] {
  const nombre = nombreConVariante(feat, variante);
  const out: EleccionDef[] = [];
  const nueva = (
    sufijo: string,
    titulo: string,
    cantidad: number,
    extra: Pick<EleccionDef, 'tipo'> & Partial<EleccionDef>,
  ) =>
    out.push({
      clave: `dote|${slot}|${nombre}|${sufijo}`,
      titulo: `${nombre}: ${titulo}`,
      origen,
      nivel: 0,
      cantidad,
      descripcion: feat.entries,
      ...extra,
    });

  // Habilidades
  (feat['skillProficiencies'] ?? []).forEach((g: any, i: number) => {
    if (g.choose) {
      nueva(`hab${i}`, 'Skills', g.choose.count ?? 1, { tipo: 'competencias', de: g.choose.from });
    } else if (g.any) {
      nueva(`hab${i}`, 'Skills', g.any, { tipo: 'competencias', de: null });
    }
  });

  // Habilidades o herramientas (Skilled)
  (feat['skillToolLanguageProficiencies'] ?? []).forEach((g: any, i: number) => {
    for (const c of g.choose ?? []) {
      nueva(`hht${i}`, 'Skills or tools', c.count ?? 1, { tipo: 'habilidadesHerramientas' });
    }
  });

  // Herramientas
  (feat['toolProficiencies'] ?? []).forEach((g: any, i: number) => {
    if (g.choose) {
      nueva(`her${i}`, 'Tools', g.choose.count ?? 1, {
        tipo: 'herramientas',
        fuenteHerramientas: 'lista',
        de: g.choose.from,
      });
    } else if (g.anyMusicalInstrument) {
      nueva(`her${i}`, 'Musical instruments', g.anyMusicalInstrument, {
        tipo: 'herramientas',
        fuenteHerramientas: 'instrumentos',
      });
    } else if (g.anyArtisansTool) {
      nueva(`her${i}`, "Artisan's tools", g.anyArtisansTool, {
        tipo: 'herramientas',
        fuenteHerramientas: 'artesano',
      });
    } else if (g.any) {
      nueva(`her${i}`, 'Tools', g.any, { tipo: 'herramientas', fuenteHerramientas: 'cualquiera' });
    }
  });

  // Expertise
  (feat['expertise'] ?? []).forEach((g: any, i: number) => {
    if (g.anyProficientSkill) {
      nueva(`exp${i}`, 'Expertise', g.anyProficientSkill, { tipo: 'experiencia', de: null });
    }
  });

  // Resistencias a elegir
  (feat['resist'] ?? []).forEach((g: any, i: number) => {
    if (g?.choose) {
      nueva(`res${i}`, 'Damage resistance', g.choose.count ?? 1, {
        tipo: 'opcion',
        opciones: (g.choose.from as string[]).map((valor) => ({ valor: titleCase(valor) })),
      });
    }
  });

  // Rasgos opcionales (Fighting Initiate, Metamagic Adept...): `*` = una vez, al tomar la dote.
  (feat['optionalfeatureProgression'] ?? []).forEach((p: any, i: number) => {
    nueva(`opt${i}`, p.name, p.progression?.['*'] ?? 1, { tipo: 'rasgoOpcional', tiposRasgo: p.featureType });
  });

  // Hechizos y característica de lanzamiento
  const bloques = (feat['additionalSpells'] ?? []) as any[];
  const bloque = variante
    ? bloques.filter((b) => String(b.name ?? '').startsWith(variante))
    : bloques.length === 1
      ? bloques
      : [];
  bloque.forEach((b, i) => {
    const habilidad = b.ability?.choose as string[] | undefined;
    if (habilidad) {
      nueva(`car${i}`, 'Spellcasting ability', 1, {
        tipo: 'opcion',
        opciones: habilidad.map((k) => ({ valor: (ABILITY_NAMES as Record<string, string>)[k] ?? k })),
      });
    }

    const grupos = [
      ...eleccionesDeHechizos(b.known?._),
      ...Object.values(b.innate?._?.daily ?? {}).flatMap(eleccionesDeHechizos),
      ...eleccionesDeHechizos(b.prepared?.['1']),
    ];
    grupos.forEach(({ filtro, cantidad }, j) => {
      const nivel = Number(filtro['level']?.[0] ?? 1);
      nueva(`hec${i}_${j}`, nivel === 0 ? 'Cantrips' : `Level ${nivel} spell`, cantidad, {
        tipo: 'hechizos',
        hechizo: {
          nivel,
          clases: filtro['class']?.map(titleCase),
          escuelas: filtro['school'],
          ritual: filtro['components & miscellaneous']?.includes('ritual') || undefined,
        },
      });
    });
  });

  return out;
}
