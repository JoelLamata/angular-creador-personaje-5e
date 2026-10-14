import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { JsonReader } from '../json-reader';
import { ClassInfo } from '../models/dnd-data';
import { puntuacionesVacias } from '../models/personaje.model';
import { DndDataService } from '../services/dnd-data.service';
import {
  Recurso,
  descansar,
  descansarGuardado,
  disponibles,
  guardarEstado,
  leerEstado,
  normalizarEstado,
  recursosDe,
} from './recursos';

class LectorDeDisco {
  async getData(nombre: string) {
    return JSON.parse(readFileSync(join(process.cwd(), 'public', 'assets', nombre), 'utf8'));
  }
}

describe('recursos', () => {
  let clases: ClassInfo[];

  beforeAll(async () => {
    TestBed.configureTestingModule({ providers: [{ provide: JsonReader, useClass: LectorDeDisco }] });
    clases = await TestBed.inject(DndDataService).getClases();
  });

  const de = (clase: string, nivel: number, subclase?: string, mods = puntuacionesVacias(0)) => {
    const c = clases.find((x) => x.name === clase && (x.source === 'XPHB' || clase === 'Artificer'))!;
    const sc = subclase ? (c.subclasses.find((s) => s.shortName === subclase && s.source === 'XPHB') ?? null) : null;
    return recursosDe(c, sc, nivel, mods);
  };
  const max = (rs: Recurso[], id: string) => rs.find((r) => r.id === id)?.max;

  it('Rage sale de la tabla de la clase: 2 usos al empezar y 5 en el nivel 12', () => {
    expect(max(de('Barbarian', 1), 'Rage')).toBe(2);
    expect(max(de('Barbarian', 3), 'Rage')).toBe(3);
    expect(max(de('Barbarian', 12), 'Rage')).toBe(5);
  });

  it('Bardic Inspiration usa el modificador de Carisma (mínimo 1) y desde el nivel 5 se recupera en descanso corto', () => {
    expect(max(de('Bard', 1), 'Bardic Inspiration')).toBe(1);
    expect(max(de('Bard', 1, undefined, { ...puntuacionesVacias(0), cha: 4 }), 'Bardic Inspiration')).toBe(4);
    expect(de('Bard', 4).find((r) => r.id === 'Bardic Inspiration')!.corto).toBe('ninguno');
    expect(de('Bard', 5).find((r) => r.id === 'Bardic Inspiration')!.corto).toBe('todos');
  });

  it('un recurso no existe antes de que la clase obtenga su rasgo', () => {
    expect(de('Cleric', 1).map((r) => r.id)).not.toContain('Channel Divinity');
    expect(max(de('Cleric', 2), 'Channel Divinity')).toBe(2);
    expect(max(de('Cleric', 6), 'Channel Divinity')).toBe(3);
    expect(de('Paladin', 2).map((r) => r.id)).not.toContain('Channel Divinity');
    expect(max(de('Paladin', 3), 'Channel Divinity')).toBe(2);
    expect(de('Monk', 1).map((r) => r.id)).not.toContain('Focus Points');
    expect(de('Fighter', 1).map((r) => r.id)).not.toContain('Action Surge');
  });

  it('Fighter: Second Wind de la tabla y Action Surge con 2 usos desde el nivel 17', () => {
    expect(max(de('Fighter', 1), 'Second Wind')).toBe(2);
    expect(max(de('Fighter', 10), 'Second Wind')).toBe(4);
    expect(max(de('Fighter', 2), 'Action Surge')).toBe(1);
    expect(max(de('Fighter', 17), 'Action Surge')).toBe(2);
  });

  it('las reservas grandes son puntos: Focus Points, Sorcery Points y Lay on Hands', () => {
    const monje = de('Monk', 5).find((r) => r.id === 'Focus Points')!;
    expect([monje.tipo, monje.max, monje.corto]).toEqual(['puntos', 5, 'todos']);
    expect(de('Sorcerer', 3).find((r) => r.id === 'Sorcery Points')!.max).toBe(3);
    const imposicion = de('Paladin', 4).find((r) => r.id === 'Lay on Hands (HP)')!;
    expect([imposicion.tipo, imposicion.max]).toEqual(['puntos', 20]);
  });

  it('los dados de superioridad solo los tiene el Battle Master y suben con el nivel', () => {
    expect(max(de('Fighter', 3, 'Battle Master'), 'Superiority Dice')).toBe(4);
    expect(max(de('Fighter', 7, 'Battle Master'), 'Superiority Dice')).toBe(5);
    expect(max(de('Fighter', 15, 'Battle Master'), 'Superiority Dice')).toBe(6);
    expect(de('Fighter', 3, 'Champion').map((r) => r.id)).not.toContain('Superiority Dice');
  });

  it('un lanzador sin recursos propios no tiene ninguno (el Wizard solo Arcane Recovery)', () => {
    expect(de('Wizard', 5).map((r) => r.id)).toEqual(['Arcane Recovery']);
    expect(de('Warlock', 5)).toEqual([]);
  });

  it('cada recurso va a la categoría donde se usa', () => {
    const cat = (rs: Recurso[], id: string) => rs.find((r) => r.id === id)?.categoria;
    expect(cat(de('Barbarian', 1), 'Rage')).toBe('adicional');
    expect(cat(de('Cleric', 2), 'Channel Divinity')).toBe('accion');
    expect(cat(de('Fighter', 2), 'Action Surge')).toBe('otros');
    expect(cat(de('Artificer', 7), 'Flash of Genius')).toBe('reaccion');
  });

  describe('estado y descansos', () => {
    const usos: Recurso = { id: 'Rage', nombre: 'Rage', tipo: 'usos', max: 3, corto: 'uno', categoria: 'adicional' };
    const reserva: Recurso = { id: 'Focus', nombre: 'Focus', tipo: 'puntos', max: 6, corto: 'todos', categoria: 'adicional' };
    const fijo: Recurso = { id: 'Surge', nombre: 'Surge', tipo: 'usos', max: 1, corto: 'ninguno', categoria: 'otros' };
    const todos = [usos, reserva, fijo];

    it('un estado vacío o inválido deja todo disponible', () => {
      const e = normalizarEstado(undefined, todos);
      expect(e).toEqual({ Rage: [false, false, false], Focus: 0, Surge: [false] });
      expect(normalizarEstado('x', todos)).toEqual(e);
    });

    it('ajusta lo guardado al máximo actual', () => {
      const e = normalizarEstado({ Rage: [true, true, true, true, true], Focus: 99, Surge: 'no' }, todos);
      expect(e['Rage']).toEqual([true, true, true]);
      expect(e['Focus']).toBe(6);
      expect(e['Surge']).toEqual([false]);
      expect(normalizarEstado({ Rage: [true] }, todos)['Rage']).toEqual([true, false, false]);
    });

    it('cuenta los disponibles', () => {
      const e = { Rage: [true, false, true], Focus: 2, Surge: [false] };
      expect(disponibles(usos, e)).toBe(1);
      expect(disponibles(reserva, e)).toBe(4);
    });

    it('el descanso largo lo recupera todo', () => {
      const gastado = { Rage: [true, true, true], Focus: 5, Surge: [true] };
      expect(descansar(todos, gastado, 'largo')).toEqual({ Rage: [false, false, false], Focus: 0, Surge: [false] });
    });

    it('el descanso corto recupera un uso, todo o nada según el recurso', () => {
      const gastado = { Rage: [true, true, true], Focus: 5, Surge: [true] };
      expect(descansar(todos, gastado, 'corto')).toEqual({ Rage: [true, true, false], Focus: 0, Surge: [true] });
    });

    it('un descanso corto sin usos gastados no cambia nada', () => {
      const libre = normalizarEstado(undefined, todos);
      expect(descansar(todos, libre, 'corto')).toEqual(libre);
    });
  });

  describe('almacenamiento del dispositivo', () => {
    const usos: Recurso = { id: 'Rage', nombre: 'Rage', tipo: 'usos', max: 3, corto: 'uno', categoria: 'adicional' };
    const puntos: Recurso = { id: 'Focus', nombre: 'Focus', tipo: 'puntos', max: 5, corto: 'todos', categoria: 'adicional' };
    beforeEach(() => localStorage.clear());

    it('sin nada guardado todo está disponible', () => {
      expect(leerEstado('a', [usos, puntos])).toEqual({ Rage: [false, false, false], Focus: 0 });
    });

    it('lo guardado se recupera y cada personaje tiene lo suyo', () => {
      guardarEstado('a', { Rage: [true, false, false], Focus: 2 });
      expect(leerEstado('a', [usos, puntos])).toEqual({ Rage: [true, false, false], Focus: 2 });
      expect(leerEstado('b', [usos, puntos])).toEqual({ Rage: [false, false, false], Focus: 0 });
    });

    it('un descanso largo sobre lo guardado lo deja todo disponible', () => {
      guardarEstado('a', { Rage: [true, true, true], Focus: 4 });
      descansarGuardado('a', [usos, puntos], 'largo');
      expect(leerEstado('a', [usos, puntos])).toEqual({ Rage: [false, false, false], Focus: 0 });
    });

    it('un descanso corto sobre lo guardado recupera según cada recurso', () => {
      guardarEstado('a', { Rage: [true, true, true], Focus: 4 });
      descansarGuardado('a', [usos, puntos], 'corto');
      expect(leerEstado('a', [usos, puntos])).toEqual({ Rage: [true, true, false], Focus: 0 });
    });

    it('un valor guardado roto no impide leer', () => {
      localStorage.setItem('ficha-recursos-gastados:a', '{no es json');
      expect(leerEstado('a', [usos])).toEqual({ Rage: [false, false, false] });
    });
  });
});
