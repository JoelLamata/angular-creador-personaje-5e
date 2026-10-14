import { Component, Input, OnChanges } from '@angular/core';
import {
  leerCantidad,
  normalizarDanio,
  proporcionDanio,
  recibirDanio,
  recuperarVida,
  vidaActual,
} from '../../utils/vida';
import { ModalComponent, OpcionModal } from '../modal/modal.component';

/**
 * Corazón con los puntos de golpe del personaje (actuales / máximos). Al pulsarlo se abre un modal
 * para restar o sumar vida. Lo que se guarda es el daño recibido, solo en este dispositivo.
 */
@Component({
  selector: 'app-puntos-golpe',
  standalone: true,
  imports: [ModalComponent],
  templateUrl: './puntos-golpe.component.html',
  styleUrl: './puntos-golpe.component.scss',
})
export class PuntosGolpeComponent implements OnChanges {
  /** Puntos de golpe máximos. */
  @Input({ required: true }) max!: number;
  /** Identifica al personaje en el almacenamiento del dispositivo. */
  @Input() almacen = 'borrador';

  protected danio = 0;
  protected abierto = false;
  protected cantidad = '';
  protected aviso = '';
  protected readonly opciones: OpcionModal[] = [
    { id: 'dano', etiqueta: 'Recibir daño', tipo: 'peligro' },
    { id: 'cura', etiqueta: 'Curar', tipo: 'principal' },
    { id: 'max', etiqueta: 'Restaurar al máximo' },
  ];

  private get clave(): string {
    return `ficha-pg-danio:${this.almacen}`;
  }

  ngOnChanges(): void {
    let guardado: unknown = 0;
    try {
      guardado = JSON.parse(localStorage.getItem(this.clave) ?? '0');
    } catch {
      guardado = 0;
    }
    this.danio = normalizarDanio(guardado);
  }

  /** Puntos de golpe actuales; pueden ser negativos. */
  protected get actual(): number {
    return vidaActual(this.max, this.danio);
  }

  /** De 0 (sano) a 1 (a 0 puntos o menos): cuánto se enrojece el corazón. */
  protected get proporcion(): number {
    return proporcionDanio(this.max, this.danio);
  }

  protected abrir(): void {
    this.cantidad = '';
    this.aviso = '';
    this.abierto = true;
  }

  protected cerrar(): void {
    this.abierto = false;
  }

  protected elegir(accion: string): void {
    if (accion === 'max') {
      this.cambiarDanio(0);
      return;
    }
    const cantidad = leerCantidad(this.cantidad);
    if (cantidad === null) {
      this.aviso = 'Escribe cuántos puntos de golpe.';
      return;
    }
    this.cambiarDanio(
      accion === 'dano' ? recibirDanio(this.danio, cantidad) : recuperarVida(this.danio, cantidad),
    );
  }

  private cambiarDanio(danio: number): void {
    this.danio = danio;
    try {
      localStorage.setItem(this.clave, JSON.stringify(danio));
    } catch {
      // Sin almacenamiento disponible el cambio dura hasta salir de la ficha.
    }
    this.abierto = false;
  }
}
