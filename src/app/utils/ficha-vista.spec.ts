import {
  agruparConEspacios,
  agruparPorNivel,
  normalizarCasillas,
  parsearEspacios,
  separarCantidad,
  unirEquipo,
} from './ficha-vista';

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

  describe('agruparConEspacios', () => {
    const h = (nombre: string, nivel: number | null, mejorable = false) => ({ nombre, nivel, mejorable });
    const agrupar = (items: ReturnType<typeof h>[], espacios: string) =>
      agruparConEspacios(items, (x) => x, (x) => x.nombre, parsearEspacios(espacios));

    it('crea un grupo por cada nivel con espacios aunque no tenga hechizos', () => {
      const grupos = agrupar([h('Mage Hand', 0), h('Shield', 1)], '4× nivel 1, 3× nivel 2, 2× nivel 3');
      expect(grupos.map((g) => [g.titulo, g.espacios])).toEqual([
        ['Cantrip', 0],
        ['Level 1', 4],
        ['Level 2', 3],
        ['Level 3', 2],
      ]);
    });

    it('repite en los niveles superiores los hechizos que mejoran, marcados como mejora', () => {
      const grupos = agrupar([h('Cure Wounds', 1, true), h('Shield', 1)], '4× nivel 1, 3× nivel 2');
      expect(grupos[0].items.map((x) => [x.item.nombre, x.mejora])).toEqual([
        ['Cure Wounds', false],
        ['Shield', false],
      ]);
      expect(grupos[1].items.map((x) => [x.item.nombre, x.mejora])).toEqual([['Cure Wounds', true]]);
    });

    it('un hechizo de nivel superior no aparece en niveles inferiores y los trucos no se repiten', () => {
      const grupos = agrupar([h('Fireball', 3, true), h('Fire Bolt', 0, true)], '4× nivel 1, 2× nivel 2, 2× nivel 3');
      expect(grupos.find((g) => g.nivel === 1)!.items).toEqual([]);
      expect(grupos.find((g) => g.nivel === 3)!.items.map((x) => x.mejora)).toEqual([false]);
      expect(grupos.find((g) => g.nivel === 0)!.items.length).toBe(1);
      expect(grupos.filter((g) => g.items.some((x) => x.item.nombre === 'Fire Bolt')).length).toBe(1);
    });

    it('sin espacios (dotes de un personaje que no lanza conjuros) agrupa solo por nivel de hechizo', () => {
      const grupos = agrupar([h('Shield', 1, true)], '');
      expect(grupos.map((g) => [g.titulo, g.espacios, g.items.length])).toEqual([['Level 1', 0, 1]]);
    });

    it('con magia de pacto solo repite en el nivel de sus espacios', () => {
      const grupos = agrupar([h('Hex', 1, true)], '2× nivel 3');
      expect(grupos.map((g) => [g.titulo, g.espacios])).toEqual([['Level 1', 0], ['Level 3', 2]]);
      expect(grupos[1].items.map((x) => x.mejora)).toEqual([true]);
    });

    it('el nivel desconocido va al final', () => {
      expect(agrupar([h('Raro', null), h('Shield', 1)], '').map((g) => g.titulo)).toEqual(['Level 1', 'Otros']);
    });
  });

  describe('normalizarCasillas', () => {
    it('ajusta lo guardado a la cantidad de espacios', () => {
      expect(normalizarCasillas([true, false, true], 2)).toEqual([true, false]);
      expect(normalizarCasillas([true], 3)).toEqual([true, false, false]);
    });

    it('ignora datos guardados inválidos', () => {
      expect(normalizarCasillas('x', 2)).toEqual([false, false]);
      expect(normalizarCasillas(undefined, 0)).toEqual([]);
      expect(normalizarCasillas(['si', 1], 2)).toEqual([false, false]);
    });
  });
});
