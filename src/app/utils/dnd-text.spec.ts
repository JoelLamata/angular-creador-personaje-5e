import { classTableCell, formatSpeed, proficiencyBonus, stripTags, tagDisplay, titleCase } from './dnd-text';

describe('dnd-text', () => {
  it('stripTags usa el texto visible de cada etiqueta', () => {
    expect(stripTags('Tienes {@variantrule Bonus Action|XPHB} y {@item Dagger|XPHB|Daggers}')).toBe(
      'Tienes Bonus Action y Daggers',
    );
  });

  it('tagDisplay no toma como texto los campos de filtros ni dados', () => {
    expect(tagDisplay('filter', 'cantrip|spells|level=0')).toBe('cantrip');
    expect(tagDisplay('scaledamage', '8d6|3-9|1d6')).toBe('1d6');
  });

  it('proficiencyBonus sube cada cuatro niveles', () => {
    expect([1, 4, 5, 9, 13, 17, 20].map(proficiencyBonus)).toEqual([2, 2, 3, 4, 5, 6, 6]);
  });

  it('titleCase respeta los apóstrofos', () => {
    expect(titleCase("calligrapher's supplies")).toBe("Calligrapher's Supplies");
  });

  it('formatSpeed describe los modos de movimiento', () => {
    expect(formatSpeed(30)).toBe('30 ft.');
    expect(formatSpeed({ walk: 30, fly: true })).toBe('30 ft., fly 30 ft.');
  });

  it('classTableCell convierte los valores de la tabla de clase', () => {
    expect(classTableCell({ type: 'bonus', value: 2 })).toBe('+2');
    expect(classTableCell({ type: 'dice', toRoll: [{ number: 1, faces: 6 }] })).toBe('1d6');
    expect(classTableCell(3)).toBe('3');
  });
});
