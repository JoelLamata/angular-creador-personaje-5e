import { LADOS_FOTO, MAX_CARACTERES_FOTO, reducirImagen, recorteCuadrado } from './imagen';

describe('imagen', () => {
  describe('recorteCuadrado', () => {
    it('una imagen apaisada se recorta por los lados, centrada', () => {
      expect(recorteCuadrado(400, 200)).toEqual({ x: 100, y: 0, lado: 200 });
    });

    it('una imagen vertical se recorta por arriba y por abajo, centrada', () => {
      expect(recorteCuadrado(200, 500)).toEqual({ x: 0, y: 150, lado: 200 });
    });

    it('una imagen cuadrada no se recorta', () => {
      expect(recorteCuadrado(300, 300)).toEqual({ x: 0, y: 0, lado: 300 });
    });

    it('redondea cuando el sobrante es impar', () => {
      const r = recorteCuadrado(101, 50);
      expect(r.lado).toBe(50);
      expect(r.x + r.lado).toBeLessThanOrEqual(101);
    });
  });

  describe('reducirImagen', () => {
    it('rechaza lo que no es una imagen', async () => {
      const texto = new File(['hola'], 'nota.txt', { type: 'text/plain' });
      await expect(reducirImagen(texto)).rejects.toThrow('no es una imagen');
    });

    it('rechaza imágenes demasiado grandes sin intentar leerlas', async () => {
      const grande = new File(['x'], 'enorme.png', { type: 'image/png' });
      Object.defineProperty(grande, 'size', { value: 16 * 1024 * 1024 });
      await expect(reducirImagen(grande)).rejects.toThrow('pesa demasiado');
    });
  });

  it('los tamaños van de mayor a menor y el límite deja sitio al resto del documento (50 KB)', () => {
    expect([...LADOS_FOTO].sort((a, b) => b - a)).toEqual(LADOS_FOTO);
    expect(MAX_CARACTERES_FOTO).toBeLessThan(50 * 1024);
  });
});
