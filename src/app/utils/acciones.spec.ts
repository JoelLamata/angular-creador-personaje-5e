import { ItemData } from '../models/dnd-data';
import { puntuacionesVacias } from '../models/personaje.model';
import {
  activacionesDe,
  analizarRasgo,
  ataqueArma,
  caracteristicaArma,
  competenteConArma,
  nivelMinimoDeTexto,
  quitarSubrasgos,
  resumirFrase,
  textoPlano,
  tipoOpcional,
} from './acciones';

const arma = (extra: Partial<ItemData> & Record<string, any>): ItemData => ({
  name: 'Arma',
  source: 'XPHB',
  type: 'M|XPHB',
  weaponCategory: 'martial',
  dmg1: '1d8',
  dmgType: 'S',
  property: [],
  ...extra,
});

describe('acciones', () => {
  describe('activacionesDe', () => {
    it('detecta una acción adicional escrita con la etiqueta de las reglas 2024', () => {
      expect(activacionesDe('Rage', ['Puedes activarlo como una {@variantrule Bonus Action|XPHB} si no llevas armadura.'])).toEqual([
        'adicional',
      ]);
    });

    it('detecta "acción adicional" y "acción extra" de las traducciones antiguas', () => {
      expect(activacionesDe('A', ['Como acción adicional, puedes hacerlo.'])).toEqual(['adicional']);
      expect(activacionesDe('B', ['Puedes lanzarlo como acción extra.'])).toEqual(['adicional']);
      expect(activacionesDe('C', ['You can do it as a bonus action.'])).toEqual(['adicional']);
    });

    it('detecta una reacción propia y no la de una criatura aliada', () => {
      expect(activacionesDe('Countercharm', ['Puedes realizar una {@variantrule Reaction|XPHB} para que se repita.'])).toEqual(['reaccion']);
      expect(activacionesDe('Acompañante', ['Puede moverse y usar su reacción por su cuenta.'])).toEqual([]);
    });

    it('detecta la acción Magic y la acción normal', () => {
      expect(activacionesDe('Turn Undead', ['Como acción de {@action Magic|XPHB}, muestras tu símbolo.'])).toEqual(['accion']);
      expect(activacionesDe('Maniobra', ['Como acción, puedes tocar a una criatura.'])).toEqual(['accion']);
      expect(activacionesDe('Healing Hands', ['As a Magic action, you touch a creature.'])).toEqual(['accion']);
    });

    it('las opciones que sustituyen un ataque de la acción Attack son acciones', () => {
      expect(activacionesDe('Breath Weapon', ['When you take the Attack action on your turn, you can replace one of your attacks with an exhalation.'])).toEqual(['accion']);
      expect(activacionesDe('War Magic', ['Cuando realices la acción Attack en tu turno, puedes sustituir uno de los ataques por el lanzamiento de un hechizo.'])).toEqual(['accion']);
    });

    it('sustituir un hechizo o una opción al subir de nivel no es una acción', () => {
      expect(activacionesDe('Spellcasting', ['Cada vez que subas un nivel de bardo, puedes sustituir uno de tus hechizos básicos por otro.'])).toEqual([]);
    });

    it('lo que ocurre sin gastar acción va a Otros, también junto a otra activación', () => {
      expect(activacionesDe('Font of Inspiration', ['Puedes gastar un espacio de hechizo (sin necesidad de realizar ninguna acción) para recuperar un uso.'])).toEqual(['otros']);
      expect(
        activacionesDe('Font of Magic', ['Como {@variantrule Bonus Action|XPHB}, puedes cambiar puntos.', 'Puedes obtener puntos (sin necesidad de realizar ninguna acción).']),
      ).toEqual(['adicional', 'otros']);
    });

    it('un añadido a una acción adicional que ya haces no es una activación', () => {
      expect(activacionesDe('Fleet Step', ['Cuando realices una {@variantrule Bonus Action|XPHB} que no sea esta, puedes moverte.'])).toEqual([]);
    });

    it('un rasgo pasivo no tiene activación', () => {
      expect(activacionesDe('Darkvision', ['Tienes visión en la oscuridad hasta 60 pies.'])).toEqual([]);
    });

    it('las tablas no cuentan (la tabla de Wild Magic Surge cita acciones adicionales)', () => {
      const entries = ['Rasgo pasivo.', { type: 'table', rows: [['1', 'Como Bonus Action puedes teletransportarte']] }];
      expect(activacionesDe('Wild Magic Surge', entries)).toEqual([]);
    });

    it('usa las excepciones para los casos que el texto no resuelve', () => {
      const texto = ['En tu turno, puedes realizar una acción adicional, excepto la acción {@action Magic|XPHB}.'];
      expect(activacionesDe('Action Surge', texto)).toEqual(['otros']);
    });

    it('mira el texto dentro de listas y entradas anidadas', () => {
      const entries = [{ type: 'entries', entries: [{ type: 'list', items: ['Como {@variantrule Bonus Action|XPHB}, haces algo.'] }] }];
      expect(activacionesDe('X', entries)).toEqual(['adicional']);
    });
  });

  describe('nivelMinimoDeTexto', () => {
    it('lee el nivel de los rasgos de especie', () => {
      expect(nivelMinimoDeTexto(['When you reach character level 3, you can transform.'])).toBe(3);
      expect(nivelMinimoDeTexto(['Starting at 5th level, you can use a bonus action.'])).toBe(5);
    });

    it('sin nivel en el texto vale 1', () => {
      expect(nivelMinimoDeTexto(['As a Magic action, you touch a creature.'])).toBe(1);
    });
  });

  describe('armas', () => {
    const mods = { ...puntuacionesVacias(0), str: 3, dex: 1 };

    it('un arma cuerpo a cuerpo usa Fuerza y una de distancia Destreza', () => {
      expect(caracteristicaArma(arma({}), mods)).toBe('str');
      expect(caracteristicaArma(arma({ type: 'R|XPHB', property: ['A|XPHB'] }), mods)).toBe('dex');
    });

    it('un arma sutil usa la mejor de las dos', () => {
      expect(caracteristicaArma(arma({ property: ['F|XPHB'] }), mods)).toBe('str');
      expect(caracteristicaArma(arma({ property: ['F|XPHB'] }), { ...mods, dex: 4 })).toBe('dex');
    });

    it('calcula ataque y daño con competencia', () => {
      const a = ataqueArma(arma({ name: 'Longsword', property: ['V|XPHB'], dmg2: '1d10' }), mods, 2, ['Simple', 'Martial']);
      expect(a.ataque).toBe(5);
      expect(a.dano).toBe('1d8+3');
      expect(a.danoVersatil).toBe('1d10+3');
      expect(a.tipoDano).toBe('slashing');
      expect(a.competente).toBe(true);
    });

    it('sin competencia no suma el bonificador y un modificador de 0 no se escribe', () => {
      const a = ataqueArma(arma({ type: 'R|XPHB' }), { ...mods, dex: 0 }, 2, ['Simple']);
      expect(a.ataque).toBe(0);
      expect(a.dano).toBe('1d8');
      expect(a.competente).toBe(false);
    });

    it('un modificador negativo resta del daño', () => {
      expect(ataqueArma(arma({}), { ...mods, str: -1 }, 2, ['Martial']).dano).toBe('1d8-1');
    });

    it('la competencia es por categoría, por propiedad o por nombre', () => {
      const espada = arma({ name: 'Rapier', property: ['F|XPHB'] });
      const hacha = arma({ name: 'Greataxe', property: ['H|XPHB', '2H|XPHB'] });
      const simple = arma({ weaponCategory: 'simple' });
      expect(competenteConArma(simple, ['Simple'])).toBe(true);
      expect(competenteConArma(hacha, ['Simple'])).toBe(false);
      expect(competenteConArma(hacha, ['Martial'])).toBe(true);
      // Rogue: martiales con Finesse o Light (así llega la cadena tras pasar por titleCase).
      const rogue = ['Simple', 'Martial Weapons That Have The {@filter Finesse Or Light|Items|Type=martial Weapon|Property=finesse;light} Property'];
      expect(competenteConArma(espada, rogue)).toBe(true);
      expect(competenteConArma(hacha, rogue)).toBe(false);
      expect(competenteConArma(hacha, ['Greataxe'])).toBe(true);
    });
  });

  describe('quitarSubrasgos', () => {
    it('quita los subrasgos que ya son rasgos propios, también dentro de otras entradas', () => {
      const entries = [
        'Texto de la cabecera.',
        { type: 'entries', name: 'Hijo', entries: ['Como Bonus Action...'] },
        { type: 'entries', name: 'Opciones', entries: [{ type: 'entries', name: 'Hijo', entries: ['x'] }, 'otro texto'] },
      ];
      expect(quitarSubrasgos(entries, new Set(['Hijo']))).toEqual([
        'Texto de la cabecera.',
        { type: 'entries', name: 'Opciones', entries: ['otro texto'] },
      ]);
    });
  });

  describe('analizarRasgo y resumirFrase', () => {
    it('devuelve la frase que explica cada activación', () => {
      const a = analizarRasgo('Font of Magic', ['Gastas puntos (sin necesidad de realizar ninguna acción).', 'Como Bonus Action, cambias puntos por un espacio.']);
      expect(a.activaciones).toEqual(['adicional', 'otros']);
      expect(a.frases.adicional).toBe('Como Bonus Action, cambias puntos por un espacio.');
      expect(a.frases.otros).toContain('sin necesidad de realizar ninguna acción');
    });

    it('con una excepción usa la primera frase del rasgo', () => {
      const a = analizarRasgo('Action Surge', ['En tu turno, puedes realizar una acción adicional.', 'Otra frase.']);
      expect(a.activaciones).toEqual(['otros']);
      expect(a.frases.otros).toBe('En tu turno, puedes realizar una acción adicional.');
    });

    it('un rasgo pasivo no tiene activaciones ni frases', () => {
      expect(analizarRasgo('Darkvision', ['Ves en la oscuridad.'])).toEqual({ activaciones: [], frases: {} });
    });

    it('recorta las frases largas sin cortar palabras', () => {
      expect(resumirFrase('corta')).toBe('corta');
      const larga = 'palabra '.repeat(30).trim();
      const r = resumirFrase(larga, 50);
      expect(r.endsWith('…')).toBe(true);
      expect(r.length).toBeLessThanOrEqual(51);
      expect(r.endsWith('palabra…')).toBe(true);
    });
  });

  describe('textoPlano y tipoOpcional', () => {
    it('quita las etiquetas y recorre listas', () => {
      expect(textoPlano(['Hola {@spell fireball|XPHB}', { type: 'list', items: ['uno'] }])).toBe('Hola fireball\nuno');
    });

    it('nombra el tipo de rasgo opcional', () => {
      expect(tipoOpcional(['MV:B'])).toBe('Maneuver');
      expect(tipoOpcional(['FS:F', 'FS:R'])).toBe('Fighting Style');
      expect(tipoOpcional(undefined)).toBe('Option');
    });
  });
});
