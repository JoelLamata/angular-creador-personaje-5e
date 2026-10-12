import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { GrupoAccion } from '../../services/acciones.service';
import { Activacion } from '../../utils/acciones';
import {
  EstadoRecursos,
  Recurso,
  descansar,
  disponibles,
  normalizarEstado,
} from '../../utils/recursos';
import { InfoCardComponent } from '../info-card/info-card.component';

type GastoTurno = 'accion' | 'adicional' | 'reaccion' | 'objeto';

/**
 * Pestaña "Acciones" de la ficha: lo que el personaje puede hacer en su turno, con un marcador de
 * lo ya gastado, los recursos con usos limitados y los descansos. Lo marcado de los recursos se
 * guarda solo en este dispositivo; el marcador de turno se reinicia al salir.
 */
@Component({
  selector: 'app-acciones-ficha',
  standalone: true,
  imports: [InfoCardComponent],
  templateUrl: './acciones-ficha.component.html',
  styleUrl: './acciones-ficha.component.scss',
})
export class AccionesFichaComponent implements OnChanges {
  @Input({ required: true }) grupos!: GrupoAccion[];
  @Input() recursos: Recurso[] = [];
  /** Identifica al personaje en el almacenamiento del dispositivo. */
  @Input() almacen = 'borrador';
  @Input() velocidad = 30;
  /** El personaje lanza hechizos: el descanso largo recupera también sus espacios. */
  @Input() conjuros = false;
  /** Se emite al descansar para que la ficha recupere también los espacios de conjuro. */
  @Output() descanso = new EventEmitter<'corto' | 'largo'>();

  protected readonly turno: { id: GastoTurno; etiqueta: string }[] = [
    { id: 'accion', etiqueta: 'Action' },
    { id: 'adicional', etiqueta: 'Bonus' },
    { id: 'reaccion', etiqueta: 'Reaction' },
    { id: 'objeto', etiqueta: 'Object' },
  ];
  protected gastado: Record<GastoTurno, boolean> = { accion: false, adicional: false, reaccion: false, objeto: false };
  protected estado: EstadoRecursos = {};
  /** Categorías elegidas como filtro; sin ninguna se muestran todas. */
  protected seleccion = new Set<Activacion>();
  /** Acciones básicas desplegadas por categoría; sin elegir, solo se abren si no hay otra cosa. */
  private basicas: Partial<Record<Activacion, boolean>> = {};

  ngOnChanges(): void {
    let guardado: unknown = {};
    try {
      guardado = JSON.parse(localStorage.getItem(this.clave) ?? '{}');
    } catch {
      guardado = {};
    }
    this.estado = normalizarEstado(guardado, this.recursos);
  }

  private get clave(): string {
    return `ficha-recursos-gastados:${this.almacen}`;
  }

  private guardar(): void {
    try {
      localStorage.setItem(this.clave, JSON.stringify(this.estado));
    } catch {
      // Sin almacenamiento disponible lo marcado dura hasta salir de la ficha.
    }
  }

  // ------------------------------------------------------------------ Turno

  protected alternarGasto(id: GastoTurno): void {
    this.gastado[id] = !this.gastado[id];
  }

  protected nuevoTurno(): void {
    this.gastado = { accion: false, adicional: false, reaccion: false, objeto: false };
  }

  // --------------------------------------------------------------- Recursos

  protected casillas(r: Recurso): boolean[] {
    const v = this.estado[r.id];
    return Array.isArray(v) ? v : [];
  }

  protected quedan(r: Recurso): number {
    return disponibles(r, this.estado);
  }

  protected marcarUso(r: Recurso, indice: number, marcado: boolean): void {
    this.casillas(r)[indice] = marcado;
    this.guardar();
  }

  /** Gasta (-1) o recupera (+1) puntos de una reserva, sin salirse de 0 ni del máximo. */
  protected moverPuntos(r: Recurso, delta: number): void {
    const gastados = Math.min(r.max, Math.max(0, Number(this.estado[r.id] ?? 0) - delta));
    this.estado = { ...this.estado, [r.id]: gastados };
    this.guardar();
  }

  protected etiquetaRecarga(r: Recurso): string {
    return r.corto === 'todos' ? 'corto o largo' : r.corto === 'uno' ? 'largo · 1 en corto' : 'largo';
  }

  protected descansar(tipo: 'corto' | 'largo'): void {
    this.estado = descansar(this.recursos, this.estado, tipo);
    this.guardar();
    this.nuevoTurno();
    this.descanso.emit(tipo);
  }

  // ------------------------------------------------------------ Categorías

  protected alternarCategoria(id: Activacion): void {
    const nueva = new Set(this.seleccion);
    if (!nueva.delete(id)) nueva.add(id);
    this.seleccion = nueva;
  }

  /** Categorías que se ven: las elegidas o, si no hay ninguna elegida, todas. */
  protected get visibles(): GrupoAccion[] {
    return this.seleccion.size ? this.grupos.filter((g) => this.seleccion.has(g.id)) : this.grupos;
  }

  /** Recursos que se usan en esta categoría. */
  protected recursosDe(g: GrupoAccion): Recurso[] {
    return this.recursos.filter((r) => r.categoria === g.id);
  }

  protected basicasAbiertas(g: GrupoAccion): boolean {
    return this.basicas[g.id] ?? g.ataques.length + g.rasgos.length + this.recursosDe(g).length === 0;
  }

  protected alternarBasicas(g: GrupoAccion): void {
    this.basicas[g.id] = !this.basicasAbiertas(g);
  }
}
