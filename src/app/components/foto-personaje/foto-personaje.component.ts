import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { reducirImagen } from '../../utils/imagen';

/**
 * Foto de perfil de un personaje, siempre cuadrada. Con `editable` se pulsa para elegir otra
 * imagen (se recorta y se reduce en el navegador) o para quitarla; el cambio se avisa por `cambio`
 * y quien lo recibe decide dónde guardarlo.
 */
@Component({
  selector: 'app-foto-personaje',
  standalone: true,
  templateUrl: './foto-personaje.component.html',
  styleUrl: './foto-personaje.component.scss',
})
export class FotoPersonajeComponent {
  @Input() foto: string | null | undefined;
  /** Para la inicial que se ve cuando no hay foto. */
  @Input() nombre = '';
  @Input() editable = false;
  /** Versión reducida, para listas. */
  @Input() pequena = false;
  /** Foto nueva (data URL) o `null` si se quita. */
  @Output() cambio = new EventEmitter<string | null>();

  protected error = '';
  protected procesando = false;
  private readonly cdr = inject(ChangeDetectorRef);

  protected get inicial(): string {
    return (this.nombre.trim()[0] ?? '?').toUpperCase();
  }

  protected async elegir(entrada: HTMLInputElement): Promise<void> {
    const archivo = entrada.files?.[0];
    // Se vacía para poder elegir de nuevo el mismo archivo.
    entrada.value = '';
    if (!archivo) return;
    this.error = '';
    this.procesando = true;
    try {
      this.cambio.emit(await reducirImagen(archivo));
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'No se pudo usar la imagen.';
    } finally {
      this.procesando = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  protected quitar(): void {
    this.error = '';
    this.cambio.emit(null);
  }
}
