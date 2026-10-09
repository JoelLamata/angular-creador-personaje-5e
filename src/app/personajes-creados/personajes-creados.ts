import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PersonajesService } from '../services/personajes.service';
import { CreadorService } from '../services/creador.service';
import { PersonajeCreado } from '../models/personaje.model';

/** Lista pública de los personajes creados con el asistente (guardados en Firestore). */
@Component({
  selector: 'app-personajes-creados',
  imports: [RouterLink, ButtonModule],
  templateUrl: './personajes-creados.html',
  styleUrl: './personajes-creados.scss',
})
export class PersonajesCreados implements OnInit {
  personajes: PersonajeCreado[] = [];
  loading = true;
  error = '';

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

  protected nuevo(): void {
    this.creador.nuevo();
    this.router.navigate(['/crear']);
  }
}
