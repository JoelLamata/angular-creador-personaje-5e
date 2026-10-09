import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CreadorService } from '../../services/creador.service';
import { Ficha, FichaService } from '../../services/ficha.service';
import { PersonajesService } from '../../services/personajes.service';
import { PersonajeCreado } from '../../models/personaje.model';
import { FichaCreadaComponent } from '../../components/ficha-creada/ficha-creada.component';

/** Paso 8: resumen, nombre y guardado. */
@Component({
  selector: 'app-paso-resumen',
  imports: [FormsModule, RouterLink, ButtonModule, FichaCreadaComponent],
  templateUrl: './paso-resumen.html',
  styleUrls: ['../crear-shared.scss'],
})
export class PasoResumen implements OnInit {
  private readonly creador = inject(CreadorService);

  personaje: PersonajeCreado = this.creador.borrador;
  ficha: Ficha | null = null;
  loading = true;
  guardando = false;
  error = '';

  protected readonly almacen = inject(PersonajesService);
  private readonly fichas = inject(FichaService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    await this.recalcular();
  }

  protected async recalcular(): Promise<void> {
    this.personaje = this.creador.borrador;
    try {
      this.ficha = await this.fichas.construir(this.personaje);
    } catch (error) {
      console.error('Error calculando la ficha:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  protected cambiar(campo: 'nombre' | 'jugador' | 'notas', valor: string): void {
    this.creador.actualizar({ [campo]: valor });
    this.personaje = this.creador.borrador;
  }

  /** Pasos que todavía faltan por completar. */
  protected get pendientes(): { texto: string; ruta: string }[] {
    const p = this.personaje;
    const faltan: { texto: string; ruta: string }[] = [];
    if (!p.clase) faltan.push({ texto: 'Elige una clase', ruta: '/crear/clase' });
    if (!p.especie) faltan.push({ texto: 'Elige una especie', ruta: '/crear/especie' });
    if (!p.trasfondo) faltan.push({ texto: 'Elige un trasfondo', ruta: '/crear/trasfondo' });
    if (!p.nombre.trim()) faltan.push({ texto: 'Pon un nombre al personaje', ruta: '' });
    return faltan;
  }

  /** Elecciones de rasgos sin completar: avisan, pero no impiden guardar. */
  protected get eleccionesPendientes(): number {
    return this.ficha?.pendientes.length ?? 0;
  }

  protected async guardar(): Promise<void> {
    if (this.pendientes.length > 0 || this.guardando) return;
    this.guardando = true;
    this.error = '';
    try {
      const id = await this.almacen.guardar(this.creador.borrador);
      this.creador.actualizar({ id });
      this.router.navigate(['/creados', id]);
    } catch (error) {
      console.error('Error guardando el personaje:', error);
      this.error = error instanceof Error ? error.message : 'No se pudo guardar el personaje.';
    } finally {
      this.guardando = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }
}
