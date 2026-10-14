/**
 * Vida actual de un personaje. Lo que se guarda es el daño recibido, no los puntos que quedan:
 * así, si los puntos de golpe máximos cambian (subir de nivel, otra Constitución), la vida actual
 * se mueve con ellos en vez de quedarse atrás. La vida puede bajar de 0 (queda en negativo); lo
 * que no puede pasar es el máximo al curar. Todo son funciones puras.
 */

/** Daño máximo que se admite (evita números absurdos al escribir). */
export const MAX_DANIO = 9999;

/** Daño recibido ajustado a lo posible: un entero entre 0 y `MAX_DANIO`. */
export function normalizarDanio(valor: unknown): number {
  const n = typeof valor === 'number' && Number.isFinite(valor) ? Math.floor(valor) : 0;
  return Math.min(MAX_DANIO, Math.max(0, n));
}

/** Puntos de golpe que le quedan al personaje; con mucho daño pueden ser negativos. */
export function vidaActual(max: number, danio: number): number {
  return max - normalizarDanio(danio);
}

/** Cuánto daño lleva respecto a su máximo, de 0 (sano) a 1 (a 0 puntos o por debajo). */
export function proporcionDanio(max: number, danio: number): number {
  if (max <= 0) return 0;
  return Math.min(1, normalizarDanio(danio) / max);
}

/** Cantidad escrita por el usuario: un entero positivo, o `null` si no sirve. */
export function leerCantidad(texto: unknown): number | null {
  const n = Number(String(texto ?? '').trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function recibirDanio(danio: number, cantidad: number): number {
  return normalizarDanio(danio + cantidad);
}

/** Curar quita daño, sin pasar de la vida máxima (el daño no baja de 0). */
export function recuperarVida(danio: number, cantidad: number): number {
  return normalizarDanio(danio - cantidad);
}
