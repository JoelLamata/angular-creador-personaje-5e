import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FichaCreadaComponent } from '../components/ficha-creada/ficha-creada.component';
import { Ficha, FichaService } from '../services/ficha.service';
import { PersonajesService } from '../services/personajes.service';
import { PersonajeCreado } from '../models/personaje.model';

/** Ficha de un personaje creado (`/creados/:id`). */
@Component({
  selector: 'app-ficha-personaje-creado',
  imports: [RouterLink, ButtonModule, FichaCreadaComponent],
  template: `
    <div class="pagina">
      <div class="acciones">
        <a routerLink="/creados" class="volver">← Personajes creados</a>
        @if (personaje) {
          <span class="botones">
            <a pButton [routerLink]="['/editar', personaje.id]" label="Editar"></a>
            <button pButton type="button" severity="danger" label="Borrar" (click)="borrar()"></button>
          </span>
        }
      </div>

      @if (loading) {
        <p class="muted">Cargando personaje...</p>
      } @else if (error) {
        <p class="aviso">{{ error }}</p>
      } @else if (personaje && ficha) {
        <app-ficha-creada [ficha]="ficha" [personaje]="personaje"></app-ficha-creada>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background-color: var(--player-color-background); }
    .pagina { width: 100%; max-width: var(--player-container-max-width); margin: 0 auto; padding: var(--player-space-6) var(--player-space-4); }
    .acciones { display: flex; flex-wrap: wrap; gap: var(--player-space-3); align-items: center; justify-content: space-between; margin-bottom: var(--player-space-4); }
    .botones { display: flex; gap: var(--player-space-2); }
    .volver { color: var(--player-color-primary); font-family: var(--player-font-body); text-decoration: none; }
    .muted { color: var(--player-color-text-muted); font-family: var(--player-font-body); }
    .aviso { padding: var(--player-space-3) var(--player-space-4); font-family: var(--player-font-body); color: var(--player-color-text); background-color: var(--player-color-surface-muted); border-left: 4px solid var(--player-color-primary); border-radius: var(--player-radius-md); }
  `,
})
export class FichaPersonajeCreado implements OnInit {
  personaje: PersonajeCreado | null = null;
  ficha: Ficha | null = null;
  loading = true;
  error = '';

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly almacen = inject(PersonajesService);
  private readonly fichas = inject(FichaService);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    try {
      this.personaje = await this.almacen.obtener(id);
      if (this.personaje) {
        this.ficha = await this.fichas.construir(this.personaje);
      } else {
        this.error = 'No se encontró el personaje.';
      }
    } catch (error) {
      console.error('Error cargando el personaje:', error);
      this.error = this.almacen.configurado
        ? 'No se pudo cargar el personaje.'
        : 'Firebase no está configurado (src/environments/environment.ts).';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  protected async borrar(): Promise<void> {
    if (!this.personaje?.id || !confirm(`¿Borrar a ${this.personaje.nombre || 'este personaje'} para siempre?`)) return;
    try {
      await this.almacen.borrar(this.personaje.id);
      this.router.navigate(['/creados']);
    } catch (error) {
      console.error('Error borrando el personaje:', error);
      this.error = 'No se pudo borrar el personaje.';
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }
}
