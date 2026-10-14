import { ChangeDetectorRef, Component, OnInit, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { FichaCreadaComponent } from '../components/ficha-creada/ficha-creada.component';
import { ModalComponent, OpcionModal } from '../components/modal/modal.component';
import { Ficha, FichaService } from '../services/ficha.service';
import { PersonajesService } from '../services/personajes.service';
import { PersonajeCreado } from '../models/personaje.model';
import { unirLista } from '../utils/ficha-vista';
import { recursosDe } from '../utils/recursos';

/** Ficha de un personaje creado (`/creados/:id`). */
@Component({
  selector: 'app-ficha-personaje-creado',
  imports: [RouterLink, ButtonModule, FichaCreadaComponent, ModalComponent],
  template: `
    <div class="pagina">
      <div class="acciones">
        <a routerLink="/creados" class="volver">← Personajes creados</a>
        @if (personaje) {
          <span class="botones">
            <a pButton [routerLink]="['/editar', personaje.id]" label="Editar"></a>
            <button
              type="button"
              class="descanso"
              aria-label="Descansar"
              title="Descansar"
              (click)="descansoAbierto = true"
            >
              <!-- Hoguera: llama sobre dos troncos cruzados. -->
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <g transform="translate(4.8 0) scale(0.6)">
                  <path
                    fill="currentColor"
                    d="M19.48 12.35c-1.57-4.08-7.16-4.3-5.81-10.23.1-.44-.37-.78-.75-.55C9.29 3.71 6.68 8 8.87 13.62c.18.46-.36.89-.75.59-1.81-1.37-2-3.34-1.84-4.75.06-.52-.62-.77-.91-.34C4.69 10.16 4 11.84 4 14.37c.38 5.6 5.11 7.32 6.81 7.54 2.43.31 5.06-.14 6.95-1.87 2.08-1.93 2.84-5.01 1.72-7.69zm-9.28 5.03c1.44-.35 2.18-1.39 2.38-2.31.33-1.43-.96-2.83-.09-5.09.33 1.87 3.27 3.04 3.27 5.08.08 2.53-2.66 4.7-5.56 2.32z"
                  />
                </g>
                <path d="M3.5 21.5 20.5 16M20.5 21.5 3.5 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
              </svg>
            </button>
          </span>
        }
      </div>

      @if (loading) {
        <p class="muted">Cargando personaje...</p>
      } @else if (error) {
        <p class="aviso">{{ error }}</p>
      } @else if (personaje && ficha) {
        @if (errorFoto) {
          <p class="aviso">{{ errorFoto }}</p>
        }
        @if (descansoHecho) {
          <p class="aviso aviso--ok" role="status">{{ descansoHecho }}</p>
        }
        <app-ficha-creada [ficha]="ficha" [personaje]="personaje" [editable]="true" (fotoCambiada)="cambiarFoto($event)"></app-ficha-creada>

        <app-modal
          titulo="Descansar"
          [abierto]="descansoAbierto"
          [opciones]="opcionesDescanso"
          (elegir)="descansar($event)"
          (cerrar)="descansoAbierto = false"
        >
          <p>Elige qué descanso hace el personaje:</p>
          <p>
            <strong>Corto:</strong>
            @if (recargaCorta) {
              recupera los espacios de {{ recargaCorta }}.
            } @else {
              no recupera ningún rasgo.
            }
          </p>
          <p>
            <strong>Largo:</strong>
            @if (ficha.lanzamiento) {
              también recupera los espacios de conjuro.
            } @else {
              recupera todos los rasgos.
            }
          </p>
        </app-modal>
      }
    </div>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background-color: var(--player-color-background); }
    .pagina { width: 100%; max-width: var(--player-container-max-width); margin: 0 auto; padding: var(--player-space-6) var(--player-space-4); }
    .acciones { display: flex; flex-wrap: wrap; gap: var(--player-space-3); align-items: center; justify-content: space-between; margin-bottom: var(--player-space-4); }
    .botones { display: flex; gap: var(--player-space-2); align-items: center; }
    .descanso { display: inline-flex; align-items: center; justify-content: center; width: 2.5rem; height: 2.5rem; padding: 0; color: var(--player-color-primary); cursor: pointer; background-color: transparent; border: var(--player-border-width-strong) solid var(--player-color-primary); border-radius: var(--player-radius-md); }
    .descanso svg { width: 1.5rem; height: 1.5rem; }
    .volver { color: var(--player-color-primary); font-family: var(--player-font-body); text-decoration: none; }
    .muted { color: var(--player-color-text-muted); font-family: var(--player-font-body); }
    .aviso--ok { margin-bottom: var(--player-space-3); }
    .aviso { padding: var(--player-space-3) var(--player-space-4); font-family: var(--player-font-body); color: var(--player-color-text); background-color: var(--player-color-surface-muted); border-left: 4px solid var(--player-color-primary); border-radius: var(--player-radius-md); }
  `,
})
export class FichaPersonajeCreado implements OnInit {
  personaje: PersonajeCreado | null = null;
  ficha: Ficha | null = null;
  descansoAbierto = false;
  descansoHecho = '';
  protected readonly opcionesDescanso: OpcionModal[] = [
    { id: 'corto', etiqueta: 'Descanso corto' },
    { id: 'largo', etiqueta: 'Descanso largo', tipo: 'principal' },
  ];
  loading = true;
  error = '';
  errorFoto = '';

  private readonly route = inject(ActivatedRoute);
  private readonly almacen = inject(PersonajesService);
  private readonly fichas = inject(FichaService);
  private readonly cdr = inject(ChangeDetectorRef);

  @ViewChild(FichaCreadaComponent) private vista?: FichaCreadaComponent;

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

  /** La foto se guarda al momento y sola, sin tocar el resto del personaje. */
  protected async cambiarFoto(foto: string | null): Promise<void> {
    const actual = this.personaje;
    if (!actual?.id) return;
    this.errorFoto = '';
    try {
      await this.almacen.actualizar(actual.id, { foto });
      this.personaje = { ...actual, foto };
    } catch (error) {
      console.error('Error guardando la foto:', error);
      this.errorFoto = 'No se pudo guardar la foto.';
    } finally {
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  /** Recursos que recupera un descanso corto, para el mensaje del modal (más la magia de pacto del Warlock). */
  protected get recargaCorta(): string {
    if (!this.ficha || !this.personaje) return '';
    const nombres = recursosDe(this.ficha.clase, this.ficha.subclase, this.personaje.nivel, this.ficha.mods)
      .filter((r) => r.corto !== 'ninguno')
      .map((r) => r.nombre);
    if (this.ficha.clase?.name === 'Warlock') nombres.push('Pact Magic');
    return unirLista(nombres);
  }

  protected descansar(tipo: string): void {
    this.vista?.descansar(tipo === 'largo' ? 'largo' : 'corto');
    this.descansoAbierto = false;
    // Confirmación breve: el modal se cierra y el cambio se ve en otras pestañas de la ficha.
    this.descansoHecho = tipo === 'largo' ? 'Descanso largo hecho.' : 'Descanso corto hecho.';
    setTimeout(() => {
      this.descansoHecho = '';
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }, 3000);
  }
}
