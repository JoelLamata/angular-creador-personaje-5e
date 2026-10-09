import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { JsonReader } from '../json-reader';
import { DndDataService } from '../services/dnd-data.service';
import { ClassInfo } from '../models/dnd-data';
import {
  alternativasMejora,
  calcularElecciones,
  doteCompleta,
  filtrarEleccionesVigentes,
  mejorasDeDote,
} from './elecciones';

/** Lee los datos reales de public/assets en lugar de pedirlos por HTTP. */
class LectorDeDisco {
  async getData(nombre: string) {
    return JSON.parse(readFileSync(join(process.cwd(), 'public', 'assets', nombre), 'utf8'));
  }
  async getSpellsData() {
    return [];
  }
}

describe('elecciones de rasgos (datos reales)', () => {
  let clases: ClassInfo[];

  const clase = (nombre: string) => clases.find((c) => c.name === nombre)!;
  const elecciones = (nombre: string, nivel: number, subclase?: string) => {
    const c = clase(nombre);
    const sub = subclase ? (c.subclasses.find((s) => s.shortName === subclase) ?? null) : null;
    return calcularElecciones(c, sub, nivel);
  };
  const resumen = (nombre: string, nivel: number, subclase?: string) =>
    elecciones(nombre, nivel, subclase).map((e) => `${e.titulo}@${e.nivel}:${e.tipo}x${e.cantidad}`);

  beforeAll(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: JsonReader, useClass: LectorDeDisco }] });
    clases = await TestBed.inject(DndDataService).getClases();
  });

  it('Bard: dos Expertise y dos mejoras de característica', () => {
    expect(resumen('Bard', 9)).toEqual([
      'Expertise@2:experienciax2',
      'Ability Score Improvement@4:dotex1',
      'Ability Score Improvement@8:dotex1',
      'Expertise@9:experienciax2',
    ]);
  });

  it('no ofrece elecciones de niveles que todavía no se han alcanzado', () => {
    expect(resumen('Bard', 1)).toEqual([]);
    expect(resumen('Bard', 2)).toEqual(['Expertise@2:experienciax2']);
  });

  it('Fighter: estilo de combate, maestría con tres armas y mejora', () => {
    const r = resumen('Fighter', 3);
    expect(r).toContain('Fighting Style@1:dotex1');
    expect(r).toContain('Weapon Mastery@1:maestriax3');
    // La tabla de la clase da una maestría más a nivel 4.
    expect(resumen('Fighter', 4)).toContain('Weapon Mastery@1:maestriax4');
    expect(resumen('Fighter', 4)).toContain('Ability Score Improvement@4:dotex1');
  });

  it('Rogue: Expertise a nivel 1 y 6, y maestría solo con armas sutiles', () => {
    const e = elecciones('Rogue', 6);
    expect(e.filter((x) => x.tipo === 'experiencia').map((x) => x.nivel)).toEqual([1, 6]);
    expect(e.find((x) => x.tipo === 'maestria')?.filtroArma).toBe('sutil');
  });

  it('Wizard: Scholar da Expertise en una habilidad de una lista cerrada', () => {
    const scholar = elecciones('Wizard', 2).find((x) => x.titulo === 'Scholar')!;
    expect(scholar.tipo).toBe('experiencia');
    expect(scholar.cantidad).toBe(1);
    expect(scholar.de).toContain('arcana');
  });

  it('Cleric: Divine Order sale de las opciones del propio rasgo', () => {
    const orden = elecciones('Cleric', 1).find((x) => x.titulo === 'Divine Order')!;
    expect(orden.opciones?.map((o) => o.valor)).toEqual(['Protector', 'Thaumaturge']);
    expect(orden.opciones?.[0].descripcion?.length).toBeGreaterThan(0);
  });

  it('Warlock y Sorcerer: el total de rasgos opcionales crece con el nivel', () => {
    const invocaciones = (n: number) =>
      elecciones('Warlock', n).find((x) => x.tipo === 'rasgoOpcional')!.cantidad;
    expect(invocaciones(1)).toBe(1);
    expect(invocaciones(5)).toBe(5);
    const metamagia = (n: number) =>
      elecciones('Sorcerer', n).find((x) => x.tipo === 'rasgoOpcional')?.cantidad;
    expect(metamagia(1)).toBeUndefined();
    expect(metamagia(2)).toBe(2);
    expect(metamagia(10)).toBe(4);
    expect(metamagia(17)).toBe(6);
  });

  it('Battle Master: las maniobras llegan por la subclase', () => {
    const maniobras = elecciones('Fighter', 7, 'Battle Master').find((x) => x.titulo === 'Maneuvers')!;
    expect(maniobras.cantidad).toBe(5);
    expect(maniobras.tiposRasgo).toEqual(['MV:B']);
  });

  it('subclase: Wild Heart ofrece Bear, Eagle y Wolf', () => {
    const rabia = elecciones('Barbarian', 3, 'Wild Heart').find((x) => x.titulo === 'Rage of the Wilds')!;
    expect(rabia.opciones?.map((o) => o.valor)).toEqual(['Bear', 'Eagle', 'Wolf']);
  });

  it('todos los rasgos de subclase del catálogo existen en los datos', () => {
    const rasgo = (c: string, s: string, nivel: number, titulo: string) =>
      elecciones(c, nivel, s).find((x) => x.titulo === titulo);

    expect(rasgo('Bard', 'Lore', 3, 'Bonus Proficiencies')).toMatchObject({ tipo: 'competencias', cantidad: 3, de: null });
    expect(rasgo('Barbarian', 'Wild Heart', 6, 'Aspect of the Wilds')?.opciones).toHaveLength(3);
    expect(rasgo('Barbarian', 'Wild Heart', 14, 'Power of the Wilds')?.opciones).toHaveLength(3);
    expect(rasgo('Ranger', 'Hunter', 3, "Hunter's Prey")?.opciones?.map((o) => o.valor)).toEqual([
      'Colossus Slayer',
      'Horde Breaker',
    ]);
    expect(rasgo('Ranger', 'Hunter', 7, 'Defensive Tactics')?.opciones).toHaveLength(2);
    expect(rasgo('Ranger', 'Beast Master', 3, 'Primal Companion')?.opciones).toHaveLength(3);
    expect(rasgo('Ranger', 'Fey Wanderer', 3, 'Otherworldly Glamour')?.de).toEqual([
      'deception',
      'performance',
      'persuasion',
    ]);
    expect(rasgo('Druid', 'Land', 3, 'Circle of the Land Spells')?.opciones).toHaveLength(4);
    expect(rasgo('Sorcerer', 'Draconic', 6, 'Elemental Affinity')?.opciones).toHaveLength(5);
  });

  it('Barbarian: Primal Knowledge usa la lista de habilidades de la clase', () => {
    const conocimiento = elecciones('Barbarian', 3).find((x) => x.titulo === 'Primal Knowledge')!;
    expect(conocimiento.tipo).toBe('competencias');
    expect(conocimiento.de).toContain('athletics');
    expect(conocimiento.de).not.toContain('arcana');
  });

  it('descarta las elecciones guardadas que ya no corresponden', () => {
    const defs = elecciones('Bard', 2);
    const guardadas = { 'Bard|Expertise|2|0': ['stealth'], 'Bard|Expertise|9|0': ['arcana'] };
    expect(Object.keys(filtrarEleccionesVigentes(guardadas, defs))).toEqual(['Bard|Expertise|2|0']);
  });
});

describe('dotes con mejora de característica', () => {
  const asi = {
    ability: [
      { choose: { from: ['str', 'dex'], amount: 2 } },
      { choose: { from: ['str', 'dex'], count: 2 } },
    ],
  };
  const actor = { ability: [{ cha: 1 }] };
  const don = { ability: [{ choose: { from: ['int', 'wis'] }, max: 30 }] };

  it('reparte +2 a una característica o +1 a dos', () => {
    expect(mejorasDeDote(asi, ['ASI', '0', 'str'])).toEqual([{ clave: 'str', incremento: 2, max: 20 }]);
    expect(mejorasDeDote(asi, ['ASI', '1', 'str', 'dex'])).toEqual([
      { clave: 'str', incremento: 1, max: 20 },
      { clave: 'dex', incremento: 1, max: 20 },
    ]);
  });

  it('aplica la mejora fija de una dote y el tope de los dones épicos', () => {
    expect(mejorasDeDote(actor, ['Actor', '0'])).toEqual([{ clave: 'cha', incremento: 1, max: 20 }]);
    expect(mejorasDeDote(don, ['Boon', '0', 'int'])[0].max).toBe(30);
  });

  it('solo se da por completa cuando están todas las características elegidas', () => {
    expect(doteCompleta(asi, ['ASI', '0'])).toBe(false);
    expect(doteCompleta(asi, ['ASI', '0', 'str'])).toBe(true);
    expect(doteCompleta(asi, ['ASI', '1', 'str'])).toBe(false);
    expect(doteCompleta(asi, ['ASI', '1', 'str', 'str'])).toBe(false);
    expect(doteCompleta({}, ['Alert'])).toBe(true);
    expect(doteCompleta(asi, undefined)).toBe(false);
  });

  it('lee las alternativas de la dote', () => {
    expect(alternativasMejora(asi)).toHaveLength(2);
    expect(alternativasMejora({})).toEqual([]);
  });
});
