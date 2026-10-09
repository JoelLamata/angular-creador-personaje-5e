import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InfoListComponent } from '../../components/info-list/info-list.component';
import { InfoItem } from '../../components/info-card/info-card.component';
import { DndEntry } from '../../models/dnd-data';
import { DndDataService } from '../../services/dnd-data.service';
import { CreadorService } from '../../services/creador.service';
import { backgroundToInfoItem, itemId } from '../../utils/info-items';
import { ABILITY_KEYS, ABILITY_NAMES, AbilityKey } from '../../utils/dnd-text';
import {
  OpcionBono,
  OpcionEquipo,
  dotesDeTrasfondo,
  opcionesBonoTrasfondo,
  opcionesEquipo,
} from '../../utils/reglas';
import { puntuacionesVacias } from '../../models/personaje.model';

/** Paso 5: trasfondo, bonificaciones de característica y equipo. */
@Component({
  selector: 'app-paso-trasfondo',
  imports: [FormsModule, RouterLink, ButtonModule, InfoListComponent],
  templateUrl: './paso-trasfondo.html',
  styleUrls: ['../crear-shared.scss'],
})
export class PasoTrasfondo implements OnInit {
  items: InfoItem[] = [];
  loading = true;
  seleccionado: string | null = null;
  trasfondo: DndEntry | null = null;

  opcionesBono: OpcionBono[] = [];
  opcionBono = 0;
  asignaciones: (AbilityKey | null)[] = [];
  opcionesEquipo: OpcionEquipo[] = [];
  equipo: string | null = null;
  dotes: string[] = [];

  protected readonly nombres = ABILITY_NAMES;

  private readonly data = inject(DndDataService);
  private readonly creador = inject(CreadorService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private fuentes: DndEntry[] = [];

  async ngOnInit(): Promise<void> {
    try {
      this.fuentes = await this.data.getTrasfondos();
      this.items = this.fuentes.map(backgroundToInfoItem);
      const actual = this.creador.borrador.trasfondo;
      if (actual) {
        this.seleccionar(this.fuentes.find((b) => b.name === actual.name && b.source === actual.source), true);
      }
    } catch (error) {
      console.error('Error cargando trasfondos:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  protected elegir(item: InfoItem): void {
    this.seleccionar(this.fuentes.find((b) => itemId(b) === item.id), false);
  }

  private seleccionar(bg: DndEntry | undefined, restaurar: boolean): void {
    if (!bg) return;
    const b = this.creador.borrador;
    this.trasfondo = bg;
    this.seleccionado = itemId(bg);
    this.opcionesBono = opcionesBonoTrasfondo(bg);
    this.opcionesEquipo = opcionesEquipo(bg['startingEquipment']).opciones;
    this.dotes = dotesDeTrasfondo(bg);

    if (restaurar) {
      const asignados = ABILITY_KEYS.filter((k) => (b.bonosTrasfondo[k] ?? 0) > 0).sort(
        (x, y) => b.bonosTrasfondo[y] - b.bonosTrasfondo[x],
      );
      this.opcionBono = Math.max(0, this.opcionesBono.findIndex((o) => o.pesos.length === asignados.length));
      this.asignaciones = this.opcionesBono[this.opcionBono]?.pesos.map((_, i) => asignados[i] ?? null) ?? [];
      this.equipo = b.equipoTrasfondo;
    } else {
      this.opcionBono = 0;
      this.asignaciones = (this.opcionesBono[0]?.pesos ?? []).map(() => null);
      this.equipo = null;
      this.guardar();
    }
  }

  protected cambiarOpcion(i: number): void {
    this.opcionBono = i;
    this.asignaciones = this.opcionesBono[i].pesos.map(() => null);
    this.guardar();
  }

  protected disponibles(slot: number): AbilityKey[] {
    const op = this.opcionesBono[this.opcionBono];
    return (op?.entre ?? []).filter((k) => k === this.asignaciones[slot] || !this.asignaciones.includes(k));
  }

  protected asignar(slot: number, valor: AbilityKey | null): void {
    this.asignaciones = this.asignaciones.map((a, i) => (i === slot ? valor : a));
    this.guardar();
  }

  protected guardar(): void {
    if (!this.trasfondo) return;
    const bonos = puntuacionesVacias(0);
    const pesos = this.opcionesBono[this.opcionBono]?.pesos ?? [];
    this.asignaciones.forEach((k, i) => {
      if (k) bonos[k] = pesos[i];
    });
    this.creador.actualizar({
      trasfondo: { name: this.trasfondo.name, source: this.trasfondo.source },
      bonosTrasfondo: bonos,
      equipoTrasfondo: this.equipo,
    });
  }

  protected textoOpcion(op: OpcionEquipo): string {
    const oro = op.oro ? `${op.oro} po` : '';
    return [op.items.join(', '), oro].filter(Boolean).join(' y ');
  }

  /** La especie ya concedió una de las dotes de este trasfondo y no es repetible. */
  protected get doteDuplicada(): string | null {
    const especie = this.creador.borrador.doteEspecie;
    return especie && this.dotes.includes(especie) && especie !== 'Skilled' ? especie : null;
  }

  protected get completo(): boolean {
    const bonosOk = this.opcionesBono.length === 0 || this.asignaciones.every((a) => a !== null);
    const equipoOk = this.opcionesEquipo.length === 0 || this.equipo !== null;
    return !!this.trasfondo && bonosOk && equipoOk;
  }

  protected continuar(): void {
    this.guardar();
    if (this.completo) this.router.navigate(['/crear/habilidades']);
  }
}
