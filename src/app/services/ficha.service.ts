import { Injectable, inject } from '@angular/core';
import { DndDataService } from './dnd-data.service';
import { PersonajeCreado } from '../models/personaje.model';
import {
  ClassFeatureData,
  ClassInfo,
  DndEntry,
  RaceInfo,
  SubclassFeatureData,
  SubclassInfo,
} from '../models/dnd-data';
import {
  ABILITY_KEYS,
  ABILITY_SHORT,
  AbilityKey,
  SKILL_ABILITY,
  SKILLS,
  abilityModifier,
  proficiencyBonus,
  titleCase,
  walkSpeed,
} from '../utils/dnd-text';
import {
  InfoLanzamiento,
  dotesDeTrasfondo,
  habilidadesFijas,
  infoLanzamiento,
  modificadores,
  opcionesEquipo,
} from '../utils/reglas';
import { eleccionesDeDote, resolverDote } from '../utils/dotes';
import {
  EleccionDef,
  calcularElecciones,
  doteCompleta,
  eleccionCompleta,
  filtrarEleccionesVigentes,
  mejorasDeDote,
} from '../utils/elecciones';

export interface FichaHabilidad {
  nombre: string;
  caracteristica: AbilityKey;
  mod: number;
  competente: boolean;
  /** Expertise: el bonificador de competencia se suma dos veces. */
  experto: boolean;
}

/** Elección ya resuelta, lista para mostrar en la ficha. */
export interface FichaEleccion {
  titulo: string;
  origen: string;
  nivel: number;
  valores: string[];
}

/** Valores derivados de un personaje creado: lo que se muestra en el resumen y la ficha. */
export interface Ficha {
  clase: ClassInfo | null;
  especie: RaceInfo | null;
  trasfondo: DndEntry | null;
  subclase: SubclassInfo | null;
  puntuaciones: Record<AbilityKey, number>;
  mods: Record<AbilityKey, number>;
  bonusCompetencia: number;
  dadoGolpe: number;
  pg: number;
  ca: number;
  velocidad: number;
  iniciativa: number;
  salvaciones: { clave: AbilityKey; mod: number; competente: boolean }[];
  habilidades: FichaHabilidad[];
  rasgosClase: ClassFeatureData[];
  rasgosSubclase: SubclassFeatureData[];
  dotes: string[];
  idiomas: string[];
  /** Todas las elecciones de rasgos que corresponden al personaje, con o sin respuesta. */
  definiciones: EleccionDef[];
  /** Elecciones de rasgos ya resueltas. */
  elecciones: FichaEleccion[];
  /** Elecciones de rasgos que faltan por completar. */
  pendientes: EleccionDef[];
  lanzamiento: InfoLanzamiento | null;
  equipo: string[];
  oro: number;
  armaduras: string[];
  armas: string[];
  herramientas: string[];
  /** Hechizos elegidos gracias a dotes (Magic Initiate, Fey-Touched...). */
  hechizosDotes: { nombre: string; origen: string }[];
}

@Injectable({ providedIn: 'root' })
export class FichaService {
  private readonly data = inject(DndDataService);

  async construir(p: PersonajeCreado): Promise<Ficha> {
    const [clases, razas, trasfondos, objetos, dotesData] = await Promise.all([
      this.data.getClases(),
      this.data.getRazas(),
      this.data.getTrasfondos(),
      this.data.getObjetos(),
      this.data.getDotes(),
    ]);
    const clase = clases.find((c) => c.name === p.clase?.name && c.source === p.clase?.source) ?? null;
    const especie = razas.find((r) => r.name === p.especie?.name && r.source === p.especie?.source) ?? null;
    const trasfondo =
      trasfondos.find((b) => b.name === p.trasfondo?.name && b.source === p.trasfondo?.source) ?? null;
    const subclase =
      clase?.subclasses.find((s) => s.name === p.subclase?.name && s.source === p.subclase?.source) ?? null;

    // Elecciones de los rasgos: solo cuentan las que siguen existiendo para esta clase y nivel.
    const definicionesClase = clase ? calcularElecciones(clase, subclase, p.nivel) : [];
    const guardadas = p.elecciones ?? {};
    const dotesElegidas = definicionesClase
      .filter((d) => d.tipo === 'dote')
      .map((d) => ({ def: d, valores: guardadas[d.clave] ?? [] }))
      .filter((x) => x.valores.length > 0);

    // Dotes que tiene el personaje, con su origen: las que traen elecciones propias las añaden.
    const origenesDote = [
      ...(p.doteEspecie ? [{ nombre: p.doteEspecie, slot: 'especie', origen: 'Especie' }] : []),
      ...(trasfondo
        ? dotesDeTrasfondo(trasfondo).map((nombre) => ({ nombre, slot: 'trasfondo', origen: 'Trasfondo' }))
        : []),
      ...dotesElegidas.map((d) => ({ nombre: d.valores[0], slot: `clase:${d.def.clave}`, origen: d.def.origen })),
    ];
    const dotesResueltas = origenesDote.flatMap((o) => {
      const r = resolverDote(dotesData, o.nombre);
      return r ? [{ ...o, ...r }] : [];
    });
    const definicionesDotes = dotesResueltas.flatMap((d) =>
      eleccionesDeDote(d.feat, d.variante, d.slot, d.origen),
    );

    const definiciones = [...definicionesDotes, ...definicionesClase];
    const respuestas = filtrarEleccionesVigentes(guardadas, definiciones);
    const deTipo = (tipo: EleccionDef['tipo']) =>
      definiciones.filter((d) => d.tipo === tipo).flatMap((d) => respuestas[d.clave] ?? []);

    // Puntuaciones: base + trasfondo + mejoras de las dotes elegidas (con su tope).
    const puntuaciones = Object.fromEntries(
      ABILITY_KEYS.map((k) => [k, p.puntuacionesBase[k] + (p.bonosTrasfondo[k] ?? 0)]),
    ) as Record<AbilityKey, number>;
    for (const k of ABILITY_KEYS) puntuaciones[k] = Math.min(20, puntuaciones[k]);
    for (const { valores } of dotesElegidas) {
      const feat = dotesData.find((d) => d.name === valores[0]);
      for (const m of mejorasDeDote(feat, valores)) {
        puntuaciones[m.clave] = Math.min(m.max, puntuaciones[m.clave] + m.incremento);
      }
    }
    const mods = modificadores(puntuaciones);
    const bonusCompetencia = proficiencyBonus(p.nivel);
    const dadoGolpe = clase?.hitDie ?? 8;
    const pg = this.puntosGolpe(dadoGolpe, p.nivel, mods.con);

    // Resilient: la competencia en la salvación es la de la característica que mejora la dote.
    const salvacionesDotes = dotesElegidas
      .filter((d) =>
        (dotesData.find((f) => f.name === d.valores[0])?.['savingThrowProficiencies'] ?? []).some(
          (s: any) => s.choose,
        ),
      )
      .map((d) => d.valores[2] as AbilityKey)
      .filter(Boolean);
    const salvacionesClase: AbilityKey[] = [...(clase?.def['proficiency'] ?? []), ...salvacionesDotes];
    const salvaciones = ABILITY_KEYS.map((k) => ({
      clave: k,
      competente: salvacionesClase.includes(k),
      mod: mods[k] + (salvacionesClase.includes(k) ? bonusCompetencia : 0),
    }));

    // "Habilidades o herramientas" (Skilled): cada valor es una habilidad o una herramienta.
    const mixtas = deTipo('habilidadesHerramientas');
    const habilidadesMixtas = mixtas.filter((v) => SKILLS.includes(v));
    const herramientasMixtas = mixtas.filter((v) => !SKILLS.includes(v));
    const competentes = new Set<string>([
      ...p.habilidadesClase,
      ...p.habilidadesEspecie,
      ...habilidadesFijas(trasfondo?.['skillProficiencies']),
      ...habilidadesFijas(especie?.['skillProficiencies']),
      ...dotesResueltas.flatMap((d) => habilidadesFijas(d.feat['skillProficiencies'])),
      ...deTipo('competencias'),
      ...habilidadesMixtas,
    ]);
    const expertos = new Set<string>(deTipo('experiencia'));
    const habilidades: FichaHabilidad[] = SKILLS.map((nombre) => {
      const caracteristica = SKILL_ABILITY[nombre];
      const competente = competentes.has(nombre) || expertos.has(nombre);
      const experto = expertos.has(nombre);
      return {
        nombre: titleCase(nombre),
        caracteristica,
        competente,
        experto,
        mod: mods[caracteristica] + (competente ? bonusCompetencia : 0) + (experto ? bonusCompetencia : 0),
      };
    });

    const rasgosClase = (clase?.features ?? []).filter((f) => f.level <= p.nivel);
    const rasgosSubclase = (subclase?.features ?? []).filter((f) => f.level <= p.nivel);

    const dotes = [
      ...(trasfondo ? dotesDeTrasfondo(trasfondo) : []),
      ...(p.doteEspecie ? [p.doteEspecie] : []),
      ...dotesElegidas.map((d) => d.valores[0]),
      ...p.dotes,
    ];

    const idiomas = [...new Set([...p.idiomas, ...deTipo('idiomas')])];

    const elecciones: FichaEleccion[] = definiciones
      .filter((d) => (respuestas[d.clave] ?? []).length > 0)
      .map((d) => ({
        titulo: d.titulo,
        origen: d.origen.replace('|', ' · '),
        nivel: d.nivel,
        valores: this.describirValores(d, respuestas[d.clave], dotesData),
      }));

    const pendientes = definiciones.filter((d) => {
      const valores = respuestas[d.clave];
      if (d.tipo === 'dote') {
        return !doteCompleta(dotesData.find((f) => f.name === valores?.[0]), valores);
      }
      return !eleccionCompleta(d, valores);
    });

    const equipo = this.equipoInicial(p, clase, trasfondo);
    const oro = equipo.oro;
    const lanzamiento = clase ? infoLanzamiento(clase.def, p.nivel, mods) : null;

    const prof = clase?.def['startingProficiencies'] ?? {};
    const herramientas = [
      ...new Set(
        [
          ...habilidadesFijas(trasfondo?.['toolProficiencies']),
          ...dotesResueltas.flatMap((d) => habilidadesFijas(d.feat['toolProficiencies'])),
          ...deTipo('herramientas'),
          ...herramientasMixtas,
        ].map(titleCase),
      ),
    ];
    const competenciasDotes = (campo: 'armorProficiencies' | 'weaponProficiencies') =>
      dotesResueltas.flatMap((d) => habilidadesFijas(d.feat[campo]).map(titleCase));
    const hechizosDotes = definiciones
      .filter((d) => d.tipo === 'hechizos')
      .flatMap((d) =>
        (respuestas[d.clave] ?? []).map((nombre) => ({ nombre, origen: d.titulo.split(':')[0] })),
      );

    return {
      clase,
      especie,
      trasfondo,
      subclase,
      puntuaciones,
      mods,
      bonusCompetencia,
      dadoGolpe,
      pg,
      ca: this.claseArmadura(equipo.items, objetos, mods.dex),
      velocidad: walkSpeed(especie?.['speed']),
      iniciativa: mods.dex,
      salvaciones,
      habilidades,
      rasgosClase,
      rasgosSubclase,
      dotes,
      idiomas,
      definiciones,
      elecciones,
      pendientes,
      lanzamiento,
      equipo: [...equipo.items, ...p.equipoExtra],
      oro,
      armaduras: [
        ...new Set([
          ...(prof.armor ?? []).map((a: any) => (typeof a === 'string' ? titleCase(a) : '')),
          ...competenciasDotes('armorProficiencies'),
        ]),
      ].filter(Boolean),
      armas: [
        ...new Set([
          ...(prof.weapons ?? []).map((w: any) => (typeof w === 'string' ? titleCase(w) : '')),
          ...competenciasDotes('weaponProficiencies'),
        ]),
      ].filter(Boolean),
      herramientas,
      hechizosDotes,
    };
  }

  /** Texto legible de los valores guardados de una elección. */
  private describirValores(def: EleccionDef, valores: string[], dotes: DndEntry[]): string[] {
    if (def.tipo === 'dote') {
      const nombre = valores[0];
      const mejora = mejorasDeDote(
        dotes.find((d) => d.name === nombre),
        valores,
      )
        .map((m) => `${ABILITY_SHORT[m.clave]} +${m.incremento}`)
        .join(', ');
      return [mejora ? `${nombre} (${mejora})` : nombre];
    }
    if (def.tipo === 'experiencia' || def.tipo === 'competencias') return valores.map(titleCase);
    return valores;
  }

  puntosGolpe(dado: number, nivel: number, mod: number): number {
    const porNivel = Math.floor(dado / 2) + 1;
    return Math.max(1, dado + mod + (nivel - 1) * (porNivel + mod));
  }

  private equipoInicial(p: PersonajeCreado, clase: ClassInfo | null, trasfondo: DndEntry | null) {
    const items: string[] = [];
    let oro = 0;
    const deClase = opcionesEquipo(clase?.def['startingEquipment']);
    const opClase = deClase.opciones.find((o) => o.letra === p.equipoClase);
    if (opClase) {
      items.push(...opClase.items);
      oro += opClase.oro;
    }
    const deTrasfondo = opcionesEquipo(trasfondo?.['startingEquipment']);
    const opTrasfondo = deTrasfondo.opciones.find((o) => o.letra === p.equipoTrasfondo);
    if (opTrasfondo) {
      items.push(...opTrasfondo.items);
      oro += opTrasfondo.oro;
    }
    return { items, oro };
  }

  /** CA con la mejor armadura del equipo elegido (las armaduras se identifican por nombre). */
  private claseArmadura(items: string[], objetos: any[], modDes: number): number {
    const nombres = items.map((i) => i.replace(/^\d+×\s*/, '').toLowerCase());
    let mejor = 10 + modDes;
    let escudo = 0;
    for (const nombre of nombres) {
      const obj = objetos.find((o) => o.name.toLowerCase() === nombre && o.ac);
      if (!obj) continue;
      const tipo = String(obj.type ?? '').split('|')[0];
      if (tipo === 'S') escudo = 2;
      else if (tipo === 'LA') mejor = Math.max(mejor, obj.ac + modDes);
      else if (tipo === 'MA') mejor = Math.max(mejor, obj.ac + Math.min(modDes, 2));
      else if (tipo === 'HA') mejor = Math.max(mejor, obj.ac);
    }
    return mejor + escudo;
  }

  /** Modificador de característica de un valor (atajo para plantillas). */
  mod(valor: number): number {
    return abilityModifier(valor);
  }
}
