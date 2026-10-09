import {
  costeCompra,
  dotesDeTrasfondo,
  eleccionesHabilidad,
  infoLanzamiento,
  opcionesBonoTrasfondo,
  opcionesEquipo,
} from './reglas';
import { puntuacionesVacias } from '../models/personaje.model';

describe('reglas', () => {
  describe('opcionesEquipo', () => {
    it('interpreta las opciones A/B con objetos, cantidades y oro', () => {
      const eq = {
        defaultData: [
          {
            A: [{ item: 'dagger|xphb', quantity: 2 }, { special: 'Spellbook' }, { value: 500 }],
            B: [{ value: 5500 }],
          },
        ],
      };
      const { opciones } = opcionesEquipo(eq);
      expect(opciones).toEqual([
        { letra: 'A', items: ['2× Dagger', 'Spellbook'], oro: 5 },
        { letra: 'B', items: [], oro: 55 },
      ]);
    });

    it('devuelve el texto en las clases clásicas sin opciones A/B', () => {
      const { opciones, texto } = opcionesEquipo({
        default: ['a {@item light crossbow|phb}'],
        defaultData: [{ _: ['x'] }],
      });
      expect(opciones).toEqual([]);
      expect(texto).toEqual(['a light crossbow']);
    });

    it('acepta el formato de lista de los trasfondos', () => {
      const { opciones } = opcionesEquipo([{ A: [{ item: 'robe|xphb' }, { value: 800 }], B: [{ value: 5000 }] }]);
      expect(opciones.map((o) => o.letra)).toEqual(['A', 'B']);
      expect(opciones[0].oro).toBe(8);
    });
  });

  describe('trasfondos', () => {
    const bg: any = {
      ability: [
        { choose: { weighted: { from: ['con', 'int', 'wis'], weights: [2, 1] } } },
        { choose: { weighted: { from: ['con', 'int', 'wis'], weights: [1, 1, 1] } } },
      ],
      feats: [{ 'magic initiate; wizard|xphb': true }],
    };

    it('extrae las opciones de bonificación de característica', () => {
      expect(opcionesBonoTrasfondo(bg)).toEqual([
        { pesos: [2, 1], entre: ['con', 'int', 'wis'] },
        { pesos: [1, 1, 1], entre: ['con', 'int', 'wis'] },
      ]);
    });

    it('da nombre legible a la dote del trasfondo', () => {
      expect(dotesDeTrasfondo(bg)).toEqual(['Magic Initiate (Wizard)']);
    });
  });

  describe('eleccionesHabilidad', () => {
    it('distingue elección acotada y libre', () => {
      expect(eleccionesHabilidad([{ choose: { from: ['insight'], count: 2 } }, { any: 1 }])).toEqual([
        { from: ['insight'], count: 2 },
        { from: null, count: 1 },
      ]);
    });
  });

  describe('costeCompra', () => {
    it('suma el coste de cada puntuación', () => {
      const p = { ...puntuacionesVacias(8), str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };
      expect(costeCompra(p)).toBe(27);
    });
  });

  describe('infoLanzamiento', () => {
    const mago: any = {
      spellcastingAbility: 'int',
      cantripProgression: [3, 3, 3, 4, 4],
      preparedSpellsProgression: [4, 5, 6, 7, 9],
      classTableGroups: [{}, { rowsSpellProgression: [[2], [3], [4, 2], [4, 3], [4, 3, 2]] }],
    };
    const mods: any = { str: 0, dex: 0, con: 0, int: 3, wis: 0, cha: 0 };

    it('calcula trucos, preparados y espacios por nivel', () => {
      const info = infoLanzamiento(mago, 5, mods)!;
      expect(info.trucos).toBe(4);
      expect(info.preparados).toBe(9);
      expect(info.nivelMaximo).toBe(3);
      expect(info.espacios).toBe('4× nivel 1, 3× nivel 2, 2× nivel 3');
    });

    it('evalúa la fórmula de hechizos preparados de las clases clásicas', () => {
      const artifice: any = {
        spellcastingAbility: 'int',
        preparedSpells: '<$level$> / 2 + <$int_mod$>',
        classTableGroups: [],
      };
      expect(infoLanzamiento(artifice, 5, mods)!.preparados).toBe(5);
    });

    it('devuelve null para clases sin magia', () => {
      expect(infoLanzamiento({ name: 'Fighter' } as any, 5, mods)).toBeNull();
    });
  });
});
