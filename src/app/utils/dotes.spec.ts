import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { JsonReader } from '../json-reader';
import { DndDataService } from '../services/dnd-data.service';
import { DndEntry } from '../models/dnd-data';
import {
  ContextoRequisitos,
  cumpleRequisitos,
  eleccionesDeDote,
  nombresSeleccionables,
  resolverDote,
  variantesDote,
} from './dotes';

class LectorDeDisco {
  async getData(nombre: string) {
    return JSON.parse(readFileSync(join(process.cwd(), 'public', 'assets', nombre), 'utf8'));
  }
}

describe('dotes (datos reales)', () => {
  let dotes: DndEntry[];

  const dote = (nombre: string) => resolverDote(dotes, nombre)!;
  const elecciones = (nombre: string) => {
    const r = dote(nombre);
    return eleccionesDeDote(r.feat, r.variante, 'test', 'Test');
  };
  const resumen = (nombre: string) =>
    elecciones(nombre).map((e) => `${e.tipo}x${e.cantidad}${e.hechizo ? ':n' + e.hechizo.nivel : ''}`);

  beforeAll(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: JsonReader, useClass: LectorDeDisco }] });
    dotes = await TestBed.inject(DndDataService).getDotes();
  });

  it('las dotes de origen son exactamente diez y Magic Initiate se ofrece en tres variantes', () => {
    const origen = dotes.filter((d) => d['category'] === 'O');
    expect(origen).toHaveLength(10);
    const nombres = origen.flatMap(nombresSeleccionables);
    expect(nombres).toHaveLength(12);
    expect(nombres).toContain('Magic Initiate (Cleric)');
    expect(nombres).toContain('Magic Initiate (Druid)');
    expect(nombres).toContain('Magic Initiate (Wizard)');
    expect(nombres).not.toContain('Magic Initiate');
  });

  it('resuelve una dote por su nombre con o sin variante', () => {
    expect(dote('Magic Initiate (Druid)').variante).toBe('Druid');
    expect(dote('Alert').variante).toBeNull();
    expect(variantesDote(dote('Alert').feat)).toEqual([]);
    expect(resolverDote(dotes, 'No existe')).toBeUndefined();
  });

  it('Magic Initiate pide característica, dos trucos y un hechizo de la lista elegida', () => {
    const defs = elecciones('Magic Initiate (Cleric)');
    expect(defs.map((d) => d.tipo)).toEqual(['opcion', 'hechizos', 'hechizos']);
    expect(defs[0].opciones?.map((o) => o.valor)).toEqual(['Intelligence', 'Wisdom', 'Charisma']);
    const trucos = defs.find((d) => d.hechizo?.nivel === 0)!;
    expect(trucos.cantidad).toBe(2);
    expect(trucos.hechizo?.clases).toEqual(['Cleric']);
    expect(defs.find((d) => d.hechizo?.nivel === 1)?.cantidad).toBe(1);
  });

  it('cada variante usa su propia lista de hechizos', () => {
    const clase = (n: string) => elecciones(n).find((d) => d.tipo === 'hechizos')!.hechizo!.clases;
    expect(clase('Magic Initiate (Druid)')).toEqual(['Druid']);
    expect(clase('Magic Initiate (Wizard)')).toEqual(['Wizard']);
  });

  it('Skilled pide tres habilidades o herramientas', () => {
    expect(resumen('Skilled')).toEqual(['habilidadesHerramientasx3']);
  });

  it('Musician pide tres instrumentos y Crafter tres herramientas de artesano', () => {
    const musico = elecciones('Musician')[0];
    expect(musico).toMatchObject({ tipo: 'herramientas', cantidad: 3, fuenteHerramientas: 'instrumentos' });
    const artesano = elecciones('Crafter')[0];
    expect(artesano).toMatchObject({ tipo: 'herramientas', cantidad: 3, fuenteHerramientas: 'lista' });
    expect(artesano.de).toContain("smith's tools");
  });

  it('las dotes sin decisiones no piden nada', () => {
    for (const n of ['Alert', 'Healer', 'Lucky', 'Savage Attacker', 'Tavern Brawler', 'Tough']) {
      expect(elecciones(n), n).toEqual([]);
    }
  });

  it('Skill Expert da una habilidad y Expertise; Blessed Warrior, dos trucos de Cleric', () => {
    expect(resumen('Skill Expert')).toEqual(['competenciasx1', 'experienciax1']);
    expect(elecciones('Blessed Warrior')[0].hechizo).toMatchObject({ nivel: 0, clases: ['Cleric'] });
  });

  it('Fey-Touched y Shadow-Touched piden un hechizo de nivel 1 de ciertas escuelas', () => {
    expect(elecciones('Fey-Touched')[0].hechizo).toMatchObject({ nivel: 1, escuelas: ['E', 'D'] });
    expect(elecciones('Shadow-Touched')[0].hechizo).toMatchObject({ nivel: 1, escuelas: ['I', 'N'] });
  });

  it('Ritual Caster pide dos hechizos de ritual de nivel 1', () => {
    expect(elecciones('Ritual Caster').find((d) => d.tipo === 'hechizos')?.hechizo).toMatchObject({
      nivel: 1,
      ritual: true,
    });
  });

  it('la clave de cada elección es única y depende del origen', () => {
    const r = dote('Magic Initiate (Cleric)');
    const a = eleccionesDeDote(r.feat, r.variante, 'especie', 'Especie').map((d) => d.clave);
    const b = eleccionesDeDote(r.feat, r.variante, 'trasfondo', 'Trasfondo').map((d) => d.clave);
    expect(new Set(a).size).toBe(a.length);
    expect(a.filter((k) => b.includes(k))).toEqual([]);
  });

  describe('requisitos', () => {
    const contexto = (extra: Partial<ContextoRequisitos> = {}): ContextoRequisitos => ({
      nivel: 4,
      puntuaciones: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      lanzaConjuros: false,
      armaduras: [],
      rasgos: [],
      ...extra,
    });
    const cumple = (nombre: string, extra?: Partial<ContextoRequisitos>) =>
      cumpleRequisitos(dote(nombre).feat, contexto(extra));

    it('las dotes de origen no piden nada', () => {
      expect(cumple('Alert', { nivel: 1 })).toBe(true);
      expect(cumple('Magic Initiate (Cleric)', { nivel: 1 })).toBe(true);
    });

    it('las dotes generales piden nivel 4', () => {
      expect(cumple('Ability Score Improvement', { nivel: 3 })).toBe(false);
      expect(cumple('Ability Score Improvement', { nivel: 4 })).toBe(true);
    });

    it('un estilo de combate pide el rasgo Fighting Style', () => {
      expect(cumple('Defense')).toBe(false);
      expect(cumple('Defense', { rasgos: ['Fighting Style'] })).toBe(true);
    });

    it('comprueba características mínimas aceptando cualquiera de las alternativas', () => {
      expect(cumple('Athlete')).toBe(false);
      expect(cumple('Athlete', { puntuaciones: { str: 13, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } })).toBe(true);
      expect(cumple('Athlete', { puntuaciones: { str: 10, dex: 14, con: 10, int: 10, wis: 10, cha: 10 } })).toBe(true);
    });

    it('comprueba lanzamiento de conjuros y competencia con armadura', () => {
      expect(cumple('War Caster')).toBe(false);
      expect(cumple('War Caster', { lanzaConjuros: true })).toBe(true);
      expect(cumple('Heavily Armored')).toBe(false);
      expect(cumple('Heavily Armored', { armaduras: ['Light', 'Medium'] })).toBe(true);
    });

    it('los dones épicos piden nivel 19', () => {
      expect(cumple('Boon of Fate', { nivel: 18 })).toBe(false);
      expect(cumple('Boon of Fate', { nivel: 19 })).toBe(true);
    });
  });
});
