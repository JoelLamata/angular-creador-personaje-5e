import { agruparPorNivel, parsearEspacios, separarCantidad, unirEquipo } from './ficha-vista';

describe('ficha-vista', () => {
  describe('separarCantidad', () => {
    it('separa la cantidad del nombre', () => {
      expect(separarCantidad('2× Dagger')).toEqual({ nombre: 'Dagger', cantidad: 2 });
      expect(separarCantidad('8× Parchment')).toEqual({ nombre: 'Parchment', cantidad: 8 });
    });

    it('acepta la x normal y espacios sobrantes', () => {
      expect(separarCantidad(' 3 x Rope ')).toEqual({ nombre: 'Rope', cantidad: 3 });
    });

    it('un nombre sin cantidad vale 1 y no se confunde con nombres que empiezan por número', () => {
      expect(separarCantidad('Quarterstaff')).toEqual({ nombre: 'Quarterstaff', cantidad: 1 });
      expect(separarCantidad('Arrows (20)')).toEqual({ nombre: 'Arrows (20)', cantidad: 1 });
    });
  });

  describe('unirEquipo', () => {
    it('suma los objetos repetidos sin distinguir mayúsculas y mantiene el orden', () => {
      expect(
        unirEquipo(['2× Dagger', 'Quarterstaff', 'Robe', 'quarterstaff', "Scholar's Pack", 'Robe']),
      ).toEqual([
        { nombre: 'Dagger', cantidad: 2 },
        { nombre: 'Quarterstaff', cantidad: 2 },
        { nombre: 'Robe', cantidad: 2 },
        { nombre: "Scholar's Pack", cantidad: 1 },
      ]);
    });

    it('ignora los textos vacíos', () => {
      expect(unirEquipo(['', '  ', 'Rope'])).toEqual([{ nombre: 'Rope', cantidad: 1 }]);
    });
  });

  describe('agruparPorNivel', () => {
    const h = (nombre: string, nivel: number | null) => ({ nombre, nivel });
    const grupos = agruparPorNivel(
      [h('Shield', 1), h('Fireball', 3), h('Mage Hand', 0), h('Fire Bolt', 0), h('Raro', null), h('Alarm', 1)],
      (x) => x.nivel,
      (x) => x.nombre,
    );

    it('ordena los niveles de menor a mayor con el nivel desconocido al final', () => {
      expect(grupos.map((g) => g.titulo)).toEqual(['Cantrip', 'Level 1', 'Level 3', 'Otros']);
    });

    it('ordena por nombre dentro de cada nivel', () => {
      expect(grupos[0].items.map((x) => x.nombre)).toEqual(['Fire Bolt', 'Mage Hand']);
      expect(grupos[1].items.map((x) => x.nombre)).toEqual(['Alarm', 'Shield']);
    });

    it('sin elementos no hay grupos', () => {
      expect(agruparPorNivel([], () => 0, () => '')).toEqual([]);
    });
  });

  describe('parsearEspacios', () => {
    it('lee los espacios de conjuro', () => {
      expect(parsearEspacios('4× nivel 1, 3× nivel 2, 2× nivel 3')).toEqual([
        { nivel: 1, cantidad: 4 },
        { nivel: 2, cantidad: 3 },
        { nivel: 3, cantidad: 2 },
      ]);
    });

    it('un texto vacío o ausente no da espacios', () => {
      expect(parsearEspacios('')).toEqual([]);
      expect(parsearEspacios(undefined)).toEqual([]);
    });
  });
});
