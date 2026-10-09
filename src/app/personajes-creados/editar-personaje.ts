import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CreadorService } from '../services/creador.service';
import { PersonajesService } from '../services/personajes.service';

/** `/editar/:id`: carga un personaje guardado en el asistente y salta al resumen. */
@Component({
  selector: 'app-editar-personaje',
  imports: [RouterLink],
  template: `
    <div class="pagina">
      @if (error) {
        <p class="aviso">{{ error }} <a routerLink="/creados">Volver al listado</a></p>
      } @else {
        <p class="muted">Cargando personaje...</p>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background-color: var(--player-color-background); }
    .pagina { max-width: var(--player-container-max-width); margin: 0 auto; padding: var(--player-space-8) var(--player-space-4); font-family: var(--player-font-body); color: var(--player-color-text); }
    .muted { color: var(--player-color-text-muted); }
    .aviso { padding: var(--player-space-3) var(--player-space-4); background-color: var(--player-color-surface-muted); border-left: 4px solid var(--player-color-primary); border-radius: var(--player-radius-md); }
  `,
})
export class EditarPersonaje implements OnInit {
  error = '';

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly almacen = inject(PersonajesService);
  private readonly creador = inject(CreadorService);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    try {
      const personaje = await this.almacen.obtener(id);
      if (!personaje) {
        this.error = 'No se encontró el personaje.';
      } else {
        this.creador.cargar(personaje);
        await this.router.navigate(['/crear/resumen']);
        return;
      }
    } catch (error) {
      console.error('Error cargando el personaje:', error);
      this.error = this.almacen.configurado
        ? 'No se pudo cargar el personaje.'
        : 'Firebase no está configurado (src/environments/environment.ts).';
    }
    this.cdr.detectChanges();
    this.cdr.markForCheck();
  }
}
