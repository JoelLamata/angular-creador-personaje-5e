import {
  MAX_DANIO,
  leerCantidad,
  normalizarDanio,
  proporcionDanio,
  recibirDanio,
  recuperarVida,
  vidaActual,
} from './vida';

describe('vida', () => {
  describe('normalizarDanio', () => {
    it('deja un daño válido tal cual', () => {
      expect(normalizarDanio(5)).toBe(5);
      expect(normalizarDanio(0)).toBe(0);
    });

    it('no baja de 0 ni pasa del tope', () => {
      expect(normalizarDanio(-3)).toBe(0);
      expect(normalizarDanio(1_000_000)).toBe(MAX_DANIO);
    });

    it('ignora lo que no es un número', () => {
      expect(normalizarDanio('7')).toBe(0);
      expect(normalizarDanio(undefined)).toBe(0);
      expect(normalizarDanio(NaN)).toBe(0);
      expect(normalizarDanio(null)).toBe(0);
    });

    it('redondea hacia abajo los decimales', () => {
      expect(normalizarDanio(4.9)).toBe(4);
    });
  });

  describe('vidaActual', () => {
    it('sin daño el personaje tiene todos sus puntos', () => {
      expect(vidaActual(21, 0)).toBe(21);
    });

    it('resta el daño recibido', () => {
      expect(vidaActual(21, 8)).toBe(13);
    });

    it('puede quedar en 0 y por debajo: la vida es negativa', () => {
      expect(vidaActual(21, 21)).toBe(0);
      expect(vidaActual(21, 25)).toBe(-4);
      expect(vidaActual(10, 21)).toBe(-11);
    });

    it('al subir el máximo (nivel nuevo) la vida actual sube con él', () => {
      expect(vidaActual(21, 5)).toBe(16);
      expect(vidaActual(30, 5)).toBe(25);
    });
  });

  describe('proporcionDanio', () => {
    it('va de 0 (sano) a 1 (a 0 puntos de vida)', () => {
      expect(proporcionDanio(40, 0)).toBe(0);
      expect(proporcionDanio(40, 10)).toBe(0.25);
      expect(proporcionDanio(40, 40)).toBe(1);
    });

    it('con la vida en negativo se queda en 1', () => {
      expect(proporcionDanio(40, 55)).toBe(1);
    });

    it('un máximo de 0 o menos no da una proporción absurda', () => {
      expect(proporcionDanio(0, 5)).toBe(0);
    });
  });

  describe('leerCantidad', () => {
    it('acepta enteros positivos, también como texto', () => {
      expect(leerCantidad(7)).toBe(7);
      expect(leerCantidad(' 12 ')).toBe(12);
    });

    it('rechaza lo que no sirve para sumar o restar vida', () => {
      expect(leerCantidad('')).toBeNull();
      expect(leerCantidad(null)).toBeNull();
      expect(leerCantidad('abc')).toBeNull();
      expect(leerCantidad(0)).toBeNull();
      expect(leerCantidad(-4)).toBeNull();
      expect(leerCantidad('2.5')).toBeNull();
    });
  });

  describe('recibirDanio y recuperarVida', () => {
    it('el daño se acumula, también por encima del máximo de vida', () => {
      expect(recibirDanio(3, 5)).toBe(8);
      expect(vidaActual(20, recibirDanio(18, 50))).toBe(-48);
    });

    it('curar reduce el daño sin pasar del máximo de vida', () => {
      expect(recuperarVida(8, 5)).toBe(3);
      expect(recuperarVida(8, 50)).toBe(0);
    });

    it('curar desde la vida en negativo cuenta desde ahí', () => {
      // 20 de máximo y 25 de daño: vida -5; con 10 de curación queda en 5.
      expect(vidaActual(20, recuperarVida(25, 10))).toBe(5);
    });
  });
});
