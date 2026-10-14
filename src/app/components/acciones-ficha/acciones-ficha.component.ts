import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { GrupoAccion } from '../../services/acciones.service';
import { Activacion } from '../../utils/acciones';
import { EstadoRecursos, Recurso, disponibles, guardarEstado, leerEstado } from '../../utils/recursos';
import { InfoCardComponent } from '../info-card/info-card.component';

type GastoTurno = 'accion' | 'adicional' | 'reaccion' | 'objeto';

/**
 * Pestaña "Acciones" de la ficha: lo que el personaje puede hacer en su turno, con un marcador de
 * lo ya gastado y los recursos con usos limitados. Lo marcado de los recursos se guarda solo en
 * este dispositivo; el marcador de turno se reinicia al salir. Los descansos los hace la ficha
 * (botón de la hoguera) y esta pestaña solo recarga lo guardado cuando cambia `reinicio`.
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
  /** Sube cada vez que la ficha hace un descanso: hay que recargar lo guardado y empezar turno nuevo. */
  @Input() reinicio = 0;

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

  ngOnChanges(cambios: SimpleChanges): void {
    this.estado = leerEstado(this.almacen, this.recursos);
    if (cambios['reinicio'] && !cambios['reinicio'].firstChange) this.nuevoTurno();
  }

  private guardar(): void {
    guardarEstado(this.almacen, this.estado);
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
