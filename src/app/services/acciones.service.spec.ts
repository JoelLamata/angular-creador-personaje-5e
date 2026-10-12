import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { JsonReader } from '../json-reader';
import { PersonajeCreado, personajeNuevo, puntuacionesVacias } from '../models/personaje.model';
import { AccionesService, GrupoAccion } from './acciones.service';
import { FichaService } from './ficha.service';

class LectorDeDisco {
  async getData(nombre: string) {
    return JSON.parse(readFileSync(join(process.cwd(), 'public', 'assets', nombre), 'utf8'));
  }
}

describe('AccionesService (datos reales)', () => {
  let fichas: FichaService;
  let servicio: AccionesService;

  /** Personaje con Fuerza 10 (+0), Destreza 14 (+2) y el resto a 10. */
  const personaje = (clase: string, nivel: number, extra: Partial<PersonajeCreado> = {}): PersonajeCreado => ({
    ...personajeNuevo(),
    nombre: 'Prueba',
    clase: { name: clase, source: 'XPHB' },
    nivel,
    especie: { name: 'Human', source: 'XPHB' },
    trasfondo: { name: 'Sage', source: 'XPHB' },
    puntuacionesBase: { ...puntuacionesVacias(10), dex: 14 },
    bonosTrasfondo: puntuacionesVacias(0),
    equipoClase: 'A',
    ...extra,
  });
  const acciones = async (p: PersonajeCreado): Promise<Record<string, string[]>> => {
    const grupos: GrupoAccion[] = await servicio.construir(await fichas.construir(p), p);
    return Object.fromEntries(grupos.map((g) => [g.id, g.items.map((i) => i.name)]));
  };

  beforeAll(() => {
    TestBed.configureTestingModule({ providers: [{ provide: JsonReader, useClass: LectorDeDisco }] });
    fichas = TestBed.inject(FichaService);
    servicio = TestBed.inject(AccionesService);
  });

  it('siempre hay cuatro categorías, en el orden acción, adicional, reacción y otros', async () => {
    const p = personaje('Fighter', 1);
    const grupos = await servicio.construir(await fichas.construir(p), p);
    expect(grupos.map((g) => g.titulo)).toEqual(['Action', 'Bonus action', 'Reactions', 'Otros']);
  });

  it('todos los personajes tienen las acciones estándar, Opportunity Attack e Interact with an Object', async () => {
    const a = await acciones(personaje('Fighter', 1));
    expect(a['accion']).toEqual(expect.arrayContaining(['Attack', 'Dash', 'Disengage', 'Dodge', 'Help', 'Hide', 'Ready', 'Search', 'Study', 'Utilize']));
    expect(a['accion']).toEqual(expect.arrayContaining(['Unarmed Strike', 'Grapple', 'Shove']));
    expect(a['reaccion']).toContain('Opportunity Attack');
    expect(a['otros']).toContain('Interact with an Object');
  });

  it('la acción Magic y End Concentration solo aparecen si el personaje lanza hechizos', async () => {
    const guerrero = await acciones(personaje('Fighter', 1));
    expect(guerrero['accion']).not.toContain('Magic');
    expect(guerrero['otros']).not.toContain('End Concentration');
    const mago = await acciones(personaje('Wizard', 1));
    expect(mago['accion']).toContain('Magic');
    expect(mago['otros']).toContain('End Concentration');
  });

  it('el Bard tiene Bardic Inspiration (adicional), Countercharm (reacción) y recuperar usos (otros)', async () => {
    const a = await acciones(personaje('Bard', 7));
    expect(a['adicional']).toContain('Bardic Inspiration');
    expect(a['reaccion']).toContain('Countercharm');
    expect(a['otros']).toContain('Font of Inspiration');
  });

  it('un rasgo que sube de nivel sale una sola vez y Action Surge va a Otros', async () => {
    const a = await acciones(personaje('Fighter', 17));
    expect(a['otros'].filter((n) => n === 'Action Surge')).toHaveLength(1);
    expect(a['adicional']).toContain('Second Wind');
  });

  it('los rasgos aparecen solo cuando se alcanza su nivel', async () => {
    expect((await acciones(personaje('Fighter', 1)))['otros']).not.toContain('Action Surge');
    expect((await acciones(personaje('Fighter', 2)))['otros']).toContain('Action Surge');
    expect((await acciones(personaje('Rogue', 1)))['adicional']).not.toContain('Cunning Action');
    const rogue = await acciones(personaje('Rogue', 5));
    expect(rogue['adicional']).toContain('Cunning Action');
    expect(rogue['reaccion']).toContain('Uncanny Dodge');
  });

  it('las armas del equipo salen con su ataque y daño, y dos armas ligeras activan Two-Weapon Fighting', async () => {
    const p = personaje('Wizard', 1);
    const f = await fichas.construir(p);
    const grupos = await servicio.construir(f, p);
    const daga = grupos[0].items.find((i) => i.name === 'Dagger')!;
    expect(daga).toBeDefined();
    // Destreza 14 (+2) + competencia (+2, el Wizard domina las armas simples); el arma es sutil.
    expect(daga.summary).toContain('Ataque +4');
    expect(daga.summary).toContain('1d4+2 piercing');
    expect(grupos[1].items.map((i) => i.name)).toContain('Two-Weapon Fighting');
  });

  it('sin competencia con el arma no se suma el bonificador', async () => {
    const p = personaje('Wizard', 1, { equipoExtra: ['Greataxe'] });
    const f = await fichas.construir(p);
    const hacha = (await servicio.construir(f, p))[0].items.find((i) => i.name === 'Greataxe')!;
    expect(hacha.summary).toContain('Ataque +0');
  });

  it('la maestría de arma solo se muestra a quien la tiene y marca las armas elegidas', async () => {
    const sin = personaje('Wizard', 1);
    const dagaSin = (await servicio.construir(await fichas.construir(sin), sin))[0].items.find((i) => i.name === 'Dagger')!;
    expect(dagaSin.entries.some((e) => String(e).includes('Mastery'))).toBe(false);

    const base = personaje('Fighter', 1, { equipoExtra: ['Longsword'] });
    const def = (await fichas.construir(base)).definiciones.find((d) => d.tipo === 'maestria')!;
    const p = { ...base, elecciones: { [def.clave]: ['Longsword'] } };
    const espada = (await servicio.construir(await fichas.construir(p), p))[0].items.find((i) => i.name === 'Longsword')!;
    expect(espada.badges).toContain('Mastery: Sap');
    const sinElegir = (await servicio.construir(await fichas.construir(base), base))[0].items.find((i) => i.name === 'Longsword')!;
    expect(sinElegir.badges).not.toContain('Mastery: Sap');
    expect(sinElegir.entries.some((e) => String(e).includes('no la has elegido'))).toBe(true);
  });

  it('Unarmed Strike, Grapple y Shove calculan ataque y CD con Fuerza', async () => {
    const p = personaje('Fighter', 1, { puntuacionesBase: { ...puntuacionesVacias(10), str: 16 } });
    const f = await fichas.construir(p);
    const items = (await servicio.construir(f, p))[0].items;
    // Fuerza 16 (+3), competencia +2.
    expect(items.find((i) => i.name === 'Unarmed Strike')!.summary).toBe('Ataque +5 · Daño 4 bludgeoning');
    expect(items.find((i) => i.name === 'Grapple')!.summary).toBe('CD 13');
    expect(items.find((i) => i.name === 'Shove')!.summary).toBe('CD 13');
  });

  it('los rasgos de especie con nivel mínimo solo aparecen al alcanzarlo', async () => {
    const aasimar = (nivel: number) => personaje('Fighter', nivel, { especie: { name: 'Aasimar', source: 'XPHB' } });
    const bajo = await acciones(aasimar(1));
    expect(bajo['accion']).toContain('Healing Hands');
    expect(bajo['adicional']).not.toContain('Celestial Revelation');
    expect((await acciones(aasimar(3)))['adicional']).toContain('Celestial Revelation');
  });

  it('las cabeceras de subclase no repiten el texto de sus rasgos hijos', async () => {
    const p = personaje('Bard', 6, { subclase: { name: 'College of Glamour', source: 'XPHB', shortName: 'Glamour' } });
    const a = await acciones(p);
    expect(a['adicional']).toContain('Mantle of Inspiration');
    expect(a['otros']).toContain('Beguiling Magic');
    expect(a['adicional']).not.toContain('College of Glamour');
    expect(a['otros']).not.toContain('College of Glamour');
  });

  it('un Dragonborn tiene Breath Weapon como acción', async () => {
    const a = await acciones(personaje('Fighter', 1, { especie: { name: 'Dragonborn', source: 'XPHB' } }));
    expect(a['accion']).toContain('Breath Weapon');
  });

  it('las dotes aportan sus acciones', async () => {
    const a = await acciones(personaje('Fighter', 1, { dotes: ['Polearm Master'] }));
    expect(a['adicional']).toContain('Polearm Master');
    expect(a['reaccion']).toContain('Polearm Master');
  });

  it('los rasgos opcionales elegidos (maniobras) aparecen en su categoría', async () => {
    const base = personaje('Fighter', 3, { subclase: { name: 'Battle Master', source: 'XPHB', shortName: 'Battle Master' } });
    const def = (await fichas.construir(base)).definiciones.find((d) => d.tipo === 'rasgoOpcional');
    expect(def).toBeDefined();
    const a = await acciones({ ...base, elecciones: { [def!.clave]: ['Riposte', 'Rally', 'Lunging Attack'] } });
    expect(a['reaccion']).toContain('Riposte');
    expect(a['adicional']).toEqual(expect.arrayContaining(['Rally', 'Lunging Attack']));
  });
});
