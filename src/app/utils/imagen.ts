/**
 * Foto de perfil de un personaje. Se acepta cualquier imagen, pero se guarda dentro del propio
 * documento de Firestore (límite de 50 KB entero), así que se recorta a un cuadrado y se
 * comprime en el navegador hasta que pese poco.
 */

/** Lado, en píxeles, de la foto guardada; con 192 se ve nítida hasta ~96 px en pantallas de alta densidad. */
export const LADOS_FOTO = [192, 160, 128, 96];
const CALIDADES = [0.85, 0.7, 0.55, 0.4];
/** Tamaño máximo del texto de la foto (data URL): deja sitio de sobra al resto del personaje. */
export const MAX_CARACTERES_FOTO = 30_000;
/** Imagen de origen más grande que se intenta leer (evita bloquear el navegador con fotos enormes). */
export const MAX_BYTES_ORIGEN = 15 * 1024 * 1024;

/** Recorte cuadrado centrado de una imagen de `ancho` × `alto`. */
export function recorteCuadrado(ancho: number, alto: number): { x: number; y: number; lado: number } {
  const lado = Math.min(ancho, alto);
  return { x: Math.round((ancho - lado) / 2), y: Math.round((alto - lado) / 2), lado };
}

type Dibujable = { width: number; height: number; liberar: () => void; fuente: CanvasImageSource };

/** Lee el archivo como imagen. `createImageBitmap` respeta la orientación EXIF; si falla (SVG...) se usa <img>. */
async function leer(archivo: File): Promise<Dibujable> {
  try {
    const bitmap = await createImageBitmap(archivo);
    return { width: bitmap.width, height: bitmap.height, fuente: bitmap, liberar: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(archivo);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { width: img.naturalWidth, height: img.naturalHeight, fuente: img, liberar: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new Error('No se pudo leer la imagen. Prueba con un JPG, PNG o WebP.');
    }
  }
}

/**
 * Convierte una imagen cualquiera en una foto cuadrada en JPEG que cabe en `MAX_CARACTERES_FOTO`.
 * Lanza un `Error` con un mensaje para el usuario si no es una imagen válida.
 */
export async function reducirImagen(archivo: File): Promise<string> {
  if (!archivo.type.startsWith('image/')) throw new Error('El archivo no es una imagen.');
  if (archivo.size > MAX_BYTES_ORIGEN) throw new Error('La imagen pesa demasiado (máximo 15 MB).');

  const imagen = await leer(archivo);
  try {
    if (!imagen.width || !imagen.height) throw new Error('La imagen está vacía.');
    const { x, y, lado } = recorteCuadrado(imagen.width, imagen.height);
    const canvas = document.createElement('canvas');
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('Tu navegador no puede procesar imágenes.');

    for (const tamano of LADOS_FOTO) {
      canvas.width = tamano;
      canvas.height = tamano;
      // El JPEG no tiene transparencia: se pinta fondo blanco para que no salga negro.
      contexto.fillStyle = '#ffffff';
      contexto.fillRect(0, 0, tamano, tamano);
      contexto.drawImage(imagen.fuente, x, y, lado, lado, 0, 0, tamano, tamano);
      for (const calidad of CALIDADES) {
        const url = canvas.toDataURL('image/jpeg', calidad);
        if (url.length <= MAX_CARACTERES_FOTO) return url;
      }
    }
    throw new Error('No se pudo reducir la imagen lo suficiente. Prueba con otra.');
  } finally {
    imagen.liberar();
  }
}
