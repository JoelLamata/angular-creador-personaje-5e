import { inlineSubclassRefs, parseSubclassFeatureKey, resolveCopies } from './dnd-resolver';

describe('dnd-resolver', () => {
  describe('resolveCopies', () => {
    const base = { name: 'Path', source: 'XGE', classSource: 'PHB', entries: ['base'], page: 9 };

    it('hereda los campos de la base y sobrescribe los propios', () => {
      const copy = { name: 'Path', source: 'XGE', classSource: 'XPHB', _copy: { name: 'Path', source: 'XGE', classSource: 'PHB' } };
      const result = resolveCopies<any>([base, copy], (b, c) => b.name === c.name && b.classSource === c.classSource);
      expect(result[1].entries).toEqual(['base']);
      expect(result[1].classSource).toBe('XPHB');
      expect(result[1]._copy).toBeUndefined();
    });

    it('deja la entrada igual si no encuentra la base', () => {
      const copy = { name: 'X', source: 'A', _copy: { name: 'Nope', source: 'A' } };
      const result = resolveCopies<any>([copy], (b, c) => b.name === c.name);
      expect(result[0]).toBe(copy);
    });

    it('aplica _mod.entries (replaceArr, appendArr y removeArr)', () => {
      const origen = {
        name: 'Race',
        source: 'A',
        entries: [
          { name: 'Size', entries: ['viejo'] },
          { name: 'Quitar', entries: ['x'] },
        ],
      };
      const copia = {
        name: 'Race',
        source: 'B',
        _copy: {
          name: 'Race',
          source: 'A',
          _mod: {
            entries: [
              { mode: 'replaceArr', replace: 'Size', items: { name: 'Size', entries: ['nuevo'] } },
              { mode: 'removeArr', names: 'Quitar' },
              { mode: 'appendArr', items: { name: 'Extra', entries: ['y'] } },
            ],
          },
        },
      };
      const [, resuelta] = resolveCopies<any>([origen, copia], (b, c) => b.name === c.name && b.source === c.source);
      expect(resuelta.entries.map((e: any) => e.name)).toEqual(['Size', 'Extra']);
      expect(resuelta.entries[0].entries).toEqual(['nuevo']);
    });
  });

  describe('parseSubclassFeatureKey', () => {
    it('usa PHB cuando la fuente va vacía', () => {
      expect(parseSubclassFeatureKey('Spirit Shield|Barbarian||Ancestral Guardian|XGE|6')).toEqual({
        name: 'Spirit Shield',
        className: 'Barbarian',
        classSource: 'PHB',
        subclassShortName: 'Ancestral Guardian',
        subclassSource: 'XGE',
        level: 6,
      });
    });
  });

  describe('inlineSubclassRefs', () => {
    const features: Record<string, any> = {
      'A|C||S||3': { name: 'A', entries: ['texto A', { type: 'refSubclassFeature', subclassFeature: 'B|C||S||3' }] },
      'B|C||S||3': { name: 'B', entries: ['texto B'] },
    };
    const lookup = (key: string) => features[key];

    it('sustituye las referencias por el contenido y marca las claves usadas', () => {
      const used = new Set<string>();
      const out = inlineSubclassRefs(features['A|C||S||3'].entries, lookup, used);
      expect(out[0]).toBe('texto A');
      expect(out[1]).toEqual({ type: 'entries', name: 'B', entries: ['texto B'] });
      expect(used.has('B|C||S||3')).toBe(true);
    });

    it('descarta las referencias que no se pueden resolver', () => {
      const out = inlineSubclassRefs([{ type: 'refSubclassFeature', subclassFeature: 'nada' }], lookup, new Set());
      expect(out).toEqual([]);
    });
  });
});
