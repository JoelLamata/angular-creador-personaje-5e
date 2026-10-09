import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DndDataService } from '../../services/dnd-data.service';
import { CreadorService } from '../../services/creador.service';
import { ClassInfo } from '../../models/dnd-data';
import { ABILITY_SHORT, AbilityKey } from '../../utils/dnd-text';

/** Paso 1: lista de clases. */
@Component({
  selector: 'app-paso-clase',
  imports: [RouterLink, AsyncPipe],
  templateUrl: './paso-clase.html',
  styleUrls: ['../crear-shared.scss', './paso-clase.scss'],
})
export class PasoClase implements OnInit {
  clases: ClassInfo[] = [];
  loading = true;

  protected readonly creador = inject(CreadorService);
  private readonly data = inject(DndDataService);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    try {
      this.clases = await this.data.getClases();
    } catch (error) {
      console.error('Error cargando clases:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  protected principal(c: ClassInfo): string {
    const prim: any[] = c.def['primaryAbility'] ?? [];
    return prim
      .map((p) => Object.keys(p).map((k) => ABILITY_SHORT[k as AbilityKey] ?? k).join(' + '))
      .join(' o ');
  }

  protected salvaciones(c: ClassInfo): string {
    return ((c.def['proficiency'] ?? []) as AbilityKey[]).map((k) => ABILITY_SHORT[k]).join(', ');
  }

  protected color(c: ClassInfo): string {
    return `var(--player-class-${c.name.toLowerCase().replace(/\s+/g, '')})`;
  }
}
