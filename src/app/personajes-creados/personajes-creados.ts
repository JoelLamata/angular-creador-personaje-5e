import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FotoPersonajeComponent } from '../components/foto-personaje/foto-personaje.component';
import { ModalComponent, OpcionModal } from '../components/modal/modal.component';
import { PersonajesService } from '../services/personajes.service';
import { CreadorService } from '../services/creador.service';
import { PersonajeCreado } from '../models/personaje.model';

/** Lista pública de los personajes creados con el asistente (guardados en Firestore). */
@Component({
  selector: 'app-personajes-creados',
  imports: [RouterLink, ButtonModule, FotoPersonajeComponent, ModalComponent],
  templateUrl: './personajes-creados.html',
  styleUrl: './personajes-creados.scss',
})
export class PersonajesCreados implements OnInit {
  personajes: PersonajeCreado[] = [];
  loading = true;
  error = '';
  errorBorrado = '';
  /** Personaje que se va a borrar (modal abierto) y si el borrado está en marcha. */
  aBorrar: PersonajeCreado | null = null;
  borrando = false;
  protected readonly opcionesBorrado: OpcionModal[] = [{ id: 'borrar', etiqueta: 'Borrar', tipo: 'peligro' }];

  protected readonly almacen = inject(PersonajesService);
  private readonly creador = inject(CreadorService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    if (!this.almacen.configurado) {
      this.loading = false;
      return;
    }
    try {
      this.personajes = await this.almacen.listar();
    } catch (error) {
      console.error('Error cargando personajes:', error);
      this.error = 'No se pudieron cargar los personajes.';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  protected resumen(p: PersonajeCreado): string {
    const clase = p.clase ? `${p.clase.name} ${p.nivel}` : 'Sin clase';
    return `${clase} · ${p.especie?.name ?? 'Sin especie'} · ${p.trasfondo?.name ?? 'Sin trasfondo'}`;
  }

  protected pedirBorrado(p: PersonajeCreado): void {
    this.errorBorrado = '';
    this.aBorrar = p;
  }

  protected cancelarBorrado(): void {
    if (!this.borrando) this.aBorrar = null;
  }

  protected async borrar(): Promise<void> {
    const p = this.aBorrar;
    if (!p?.id || this.borrando) return;
    this.borrando = true;
    try {
      await this.almacen.borrar(p.id);
      this.personajes = this.personajes.filter((x) => x.id !== p.id);
      this.aBorrar = null;
    } catch (error) {
      console.error('Error borrando el personaje:', error);
      this.errorBorrado = 'No se pudo borrar el personaje.';
      this.aBorrar = null;
    } finally {
      this.borrando = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  protected nuevo(): void {
    this.creador.nuevo();
    this.router.navigate(['/crear']);
  }
}
