import { Injectable, inject } from '@angular/core';
import { InfoItem } from '../components/info-card/info-card.component';
import { DndEntry, ItemData } from '../models/dnd-data';
import { PersonajeCreado } from '../models/personaje.model';
import {
  ACTIVACIONES,
  Activacion,
  activacionesDe,
  ataqueArma,
  esArma,
  esCuerpoACuerpo,
  esLigera,
  maestriaDe,
  nivelMinimoDeTexto,
  nombresPropiedades,
  quitarSubrasgos,
  tipoOpcional,
} from '../utils/acciones';
import { formatModifier } from '../utils/dnd-text';
import { resolverDote } from '../utils/dotes';
import { unirEquipo } from '../utils/ficha-vista';
import { DndDataService } from './dnd-data.service';
import { Ficha } from './ficha.service';

export interface GrupoAccion {
  id: Activacion;
  titulo: string;
  items: InfoItem[];
}

/** Rasgo del personaje del que puede salir una acción, venga de donde venga. */
interface Candidato {
  nombre: string;
  entries: any[];
  source: string;
  /** Quién lo concede: la clase, la subclase, la especie, "Dote"... */
  origen: string;
}

const INTERACTUAR =
  'Una vez por turno puedes interactuar con un objeto o con un elemento del entorno sin gastar acción, ' +
  'durante tu movimiento o junto a otra acción (desenvainar un arma al atacar, abrir una puerta, coger un objeto...). ' +
  'Cualquier otra interacción, o una más compleja, requiere la acción Utilize.';

/** Acciones estándar de las reglas 2024, en el orden en que se muestran dentro de "Action". */
const ACCIONES_BASE = ['Dash', 'Disengage', 'Dodge', 'Help', 'Hide', 'Influence', 'Magic', 'Ready', 'Search', 'Study', 'Utilize', 'Escape a Grapple'];

/**
 * Reúne todo lo que el personaje puede hacer en su turno, repartido en acción, acción adicional,
 * reacción y otros: acciones estándar, ataques con sus armas y los rasgos de clase, subclase,
 * especie, dotes y rasgos opcionales (maniobras, invocaciones...) que se activan así.
 */
@Injectable({ providedIn: 'root' })
export class AccionesService {
  private readonly data = inject(DndDataService);

  async construir(ficha: Ficha, p: PersonajeCreado): Promise<GrupoAccion[]> {
    const [acciones, objetos, reglas, dotes] = await Promise.all([
      this.data.getAcciones(),
      this.data.getObjetos(),
      this.data.getReglas(),
      this.data.getDotes(),
    ]);
    const grupos: Record<Activacion, InfoItem[]> = { accion: [], adicional: [], reaccion: [], otros: [] };

    const lanza = !!ficha.lanzamiento || p.hechizos.length > 0 || ficha.hechizosDotes.length > 0;
    const buscarObjeto = (nombre: string) =>
      objetos.find((o) => o.name.toLowerCase() === nombre.toLowerCase() && o.source === 'XPHB') ??
      objetos.find((o) => o.name.toLowerCase() === nombre.toLowerCase());
    const equipo = unirEquipo(ficha.equipo).map((e) => ({ ...e, item: buscarObjeto(e.nombre) }));
    const armas = equipo.filter((e): e is typeof e & { item: ItemData } => !!e.item && esArma(e.item));
    const tieneEscudo = equipo.some((e) => e.item && String(e.item.type ?? '').split('|')[0] === 'S');
    const ligeras = armas.filter((a) => esCuerpoACuerpo(a.item) && esLigera(a.item)).reduce((n, a) => n + a.cantidad, 0);

    // ---- Acciones estándar (datos de actions.json) ------------------------------
    const estandar = (nombre: string): InfoItem | null => {
      const a = acciones.find((x) => x.name === nombre && x.source === 'XPHB');
      return a ? { id: `general|${nombre}`, name: a.name, source: a.source, badges: ['General'], entries: a.entries ?? [] } : null;
    };
    const poner = (act: Activacion, item: InfoItem | null) => item && grupos[act].push(item);

    poner('accion', estandar('Attack'));
    this.ataques(ficha, p, armas, reglas, grupos.accion);
    for (const nombre of ACCIONES_BASE) {
      if (nombre === 'Magic' && !lanza) continue;
      poner('accion', estandar(nombre));
    }
    if (tieneEscudo) poner('accion', estandar('Don or Doff a Shield'));
    if (ligeras >= 2) poner('adicional', estandar('Two-Weapon Fighting'));
    poner('reaccion', estandar('Opportunity Attack'));
    poner('otros', { id: 'general|Interact', name: 'Interact with an Object', source: '', badges: ['General'], entries: [INTERACTUAR] });
    if (lanza) poner('otros', estandar('End Concentration'));

    // ---- Rasgos del personaje ---------------------------------------------------
    const unicos = new Map<string, InfoItem>();
    for (const c of await this.candidatos(ficha, p, dotes)) {
      for (const act of activacionesDe(c.nombre, c.entries)) {
        // El mismo rasgo mejora de nivel (Action Surge) o se repite en dos usos: gana el último.
        unicos.set(`${act}|${c.origen}|${c.nombre}`, {
          id: `${act}|${c.origen}|${c.nombre}`,
          name: c.nombre,
          source: c.source,
          badges: [c.origen],
          entries: c.entries,
        });
      }
    }
    for (const [clave, item] of unicos) grupos[clave.split('|')[0] as Activacion].push(item);

    return ACTIVACIONES.map((a) => ({ id: a.id, titulo: a.titulo, items: grupos[a.id] }));
  }

  // ----------------------------------------------------------------- Ataques

  /** Un ataque por cada arma del equipo, más Unarmed Strike y sus opciones (Grapple y Shove). */
  private ataques(
    ficha: Ficha,
    p: PersonajeCreado,
    armas: { nombre: string; cantidad: number; item: ItemData }[],
    reglas: DndEntry[],
    destino: InfoItem[],
  ): void {
    // Solo las clases con Weapon Mastery eligen armas con maestría.
    const tieneMaestrias = ficha.definiciones.some((d) => d.tipo === 'maestria');
    const maestrias = new Set(
      ficha.definiciones
        .filter((d) => d.tipo === 'maestria')
        .flatMap((d) => p.elecciones[d.clave] ?? [])
        .map((n) => n.toLowerCase()),
    );
    for (const { nombre, cantidad, item } of armas) {
      const a = ataqueArma(item, ficha.mods, ficha.bonusCompetencia, ficha.armas);
      const maestria = maestriaDe(item);
      const dano = `${a.dano}${a.tipoDano ? ' ' + a.tipoDano : ''}`;
      const props = nombresPropiedades(item);
      destino.push({
        id: `accion|arma|${nombre}`,
        name: nombre,
        source: '',
        summary: `Ataque ${formatModifier(a.ataque)} · Daño ${dano}${a.danoVersatil ? ` (${a.danoVersatil} a dos manos)` : ''}`,
        badges: [
          ...(cantidad > 1 ? [`×${cantidad}`] : []),
          ...(maestria && tieneMaestrias && maestrias.has(nombre.toLowerCase()) ? [`Mastery: ${maestria}`] : []),
        ],
        entries: [
          `${esCuerpoACuerpo(item) ? 'Melee' : 'Ranged'} weapon attack.`,
          ...(item['range'] ? [`Range: ${item['range']} ft.`] : []),
          ...(props.length ? [`Properties: ${props.join(', ')}.`] : []),
          ...(maestria && tieneMaestrias
            ? [`Mastery: ${maestria}${maestrias.has(nombre.toLowerCase()) ? '' : ' (no la has elegido)'}.`]
            : []),
          ...(a.competente ? [] : ['Sin competencia con esta arma: no se suma el bonificador de competencia.']),
          ...((item.entries ?? []) as any[]),
        ],
      });
    }

    // Unarmed Strike: daño = 1 + Fuerza; Grapple y Shove usan una CD de 8 + Fuerza + competencia.
    const fuerza = ficha.mods.str;
    const golpe = reglas.find((r) => r.name === 'Unarmed Strike' && r.source === 'XPHB');
    if (!golpe) return;
    const opcion = (nombre: string) => buscarEntrada(golpe.entries ?? [], nombre);
    const cd = 8 + fuerza + ficha.bonusCompetencia;
    const textos = (golpe.entries ?? []).filter((e) => typeof e === 'string');
    destino.push(
      {
        id: 'accion|golpe',
        name: 'Unarmed Strike',
        source: golpe.source,
        summary: `Ataque ${formatModifier(fuerza + ficha.bonusCompetencia)} · Daño ${Math.max(0, 1 + fuerza)} bludgeoning`,
        badges: ['General'],
        entries: [...textos.slice(0, 1), ...[opcion('Damage')].filter(Boolean)],
      },
      ...(['Grapple', 'Shove'] as const).flatMap((nombre) => {
        const e = opcion(nombre);
        return e
          ? [{ id: `accion|${nombre}`, name: nombre, source: golpe.source, summary: `CD ${cd}`, badges: ['General'], entries: [e] }]
          : [];
      }),
    );
  }

  // ------------------------------------------------------------------ Rasgos

  /** Todos los rasgos del personaje que pueden ser una acción, ya con su origen. */
  private async candidatos(ficha: Ficha, p: PersonajeCreado, dotes: DndEntry[]): Promise<Candidato[]> {
    const out: Candidato[] = [];
    // Se usan los rasgos "planos" (`allFeatures`): los de cabecera (p. ej. "College of Glamour")
    // llevan dentro el texto de sus hijos y los de clase como Flurry of Blows solo están citados.
    const clase = ficha.clase?.name ?? 'Clase';
    for (const f of (ficha.clase?.allFeatures ?? []).filter((x) => x.level <= p.nivel)) {
      out.push({ nombre: f.name, entries: f.entries ?? [], source: f.source, origen: clase });
    }
    const deSubclase = ficha.subclase?.allFeatures ?? [];
    for (const f of deSubclase.filter((x) => x.level <= p.nivel)) {
      const hijos = new Set(deSubclase.map((x) => x.name).filter((n) => n !== f.name));
      out.push({
        nombre: f.name,
        entries: quitarSubrasgos(f.entries, hijos),
        source: f.source,
        origen: p.subclase?.shortName ?? 'Subclase',
      });
    }

    // Especie: rasgos con nombre, solo los que ya se tienen al nivel actual (Celestial Revelation, nivel 3).
    const especie = ficha.especie;
    if (especie) {
      const subespecie = especie.subraces.find((s) => s.name === p.linaje);
      for (const fuente of [especie, ...(subespecie ? [subespecie] : [])]) {
        for (const e of (fuente.entries ?? []) as any[]) {
          if (!e || typeof e !== 'object' || !e.name || !Array.isArray(e.entries)) continue;
          if (nivelMinimoDeTexto(e.entries) > p.nivel) continue;
          out.push({ nombre: e.name, entries: e.entries, source: fuente.source, origen: especie.name });
        }
      }
    }

    // Dotes (incluye la del trasfondo, la de la especie y las mejoras de característica).
    const vistas = new Set<string>();
    for (const nombre of ficha.dotes) {
      const r = resolverDote(dotes, nombre);
      if (!r || vistas.has(nombre)) continue;
      vistas.add(nombre);
      out.push({ nombre, entries: r.feat.entries ?? [], source: r.feat.source, origen: 'Dote' });
    }

    // Rasgos opcionales elegidos: maniobras, metamagia, invocaciones...
    for (const def of ficha.definiciones.filter((d) => d.tipo === 'rasgoOpcional')) {
      const elegidos = p.elecciones[def.clave] ?? [];
      if (!elegidos.length) continue;
      const disponibles = await this.data.getRasgosOpcionales(def.tiposRasgo ?? []);
      for (const nombre of elegidos) {
        const o = disponibles.find((x) => x.name === nombre);
        if (o) out.push({ nombre, entries: o.entries ?? [], source: o.source, origen: tipoOpcional(o['featureType']) });
      }
    }
    return out;
  }
}

/** Busca una entrada con nombre dentro de un árbol de entradas 5etools. */
function buscarEntrada(entries: any[], nombre: string): any | undefined {
  for (const e of entries) {
    if (!e || typeof e !== 'object') continue;
    if (e.name === nombre) return e;
    const dentro = buscarEntrada(e.entries ?? [], nombre);
    if (dentro) return dentro;
  }
  return undefined;
}
