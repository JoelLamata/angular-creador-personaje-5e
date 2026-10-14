import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';

export interface OpcionModal {
  id: string;
  etiqueta: string;
  /** `principal` y `peligro` van rellenos; `normal` solo con borde. */
  tipo?: 'normal' | 'principal' | 'peligro';
}

let contador = 0;

/**
 * Ventana modal de la propia web (no un `confirm()` del navegador). Usa el elemento `<dialog>`,
 * que ya cuida el foco, cierra con Escape y oscurece el fondo; aquí solo se le da el estilo de la
 * aplicación. El contenido es el texto que se proyecta dentro y las opciones son sus botones; el
 * botón «Cancelar» siempre está y cierra el modal.
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
})
export class ModalComponent implements OnChanges {
  @Input() abierto = false;
  @Input() titulo = '';
  @Input() opciones: OpcionModal[] = [];
  /** Mientras algo está en marcha (p. ej. borrando) los botones no responden. */
  @Input() ocupado = false;
  /** Se elige una de las opciones. */
  @Output() elegir = new EventEmitter<string>();
  /** Se pide cerrar sin elegir (Cancelar, Escape o pulsar fuera). */
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('dialogo', { static: true }) private dialogo!: ElementRef<HTMLDialogElement>;
  protected readonly idTitulo = `modal-titulo-${++contador}`;

  ngOnChanges(): void {
    const d = this.dialogo.nativeElement;
    // Sin soporte de <dialog> (servidor, tests) no hay nada que abrir.
    if (this.abierto && !d.open) d.showModal?.();
    else if (!this.abierto && d.open) d.close?.();
  }

  /**
   * Escape no cierra el diálogo por su cuenta: se avisa con `cerrar` y quien lo usa decide (así no
   * se cierra mientras algo está en marcha) cambiando `abierto`, que es la única fuente de verdad.
   */
  protected alCancelar(evento: Event): void {
    evento.preventDefault();
    if (!this.ocupado) this.cerrar.emit();
  }

  /** Pulsar en el fondo oscuro (el propio <dialog>, fuera de su contenido) cierra. */
  protected clicFuera(evento: MouseEvent): void {
    if (evento.target === this.dialogo.nativeElement && !this.ocupado) this.cerrar.emit();
  }
}
