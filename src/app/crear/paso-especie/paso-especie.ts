import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { InfoListComponent } from '../../components/info-list/info-list.component';
import { InfoItem } from '../../components/info-card/info-card.component';
import { DndDataService } from '../../services/dnd-data.service';
import { CreadorService } from '../../services/creador.service';
import { itemId, raceToInfoItem } from '../../utils/info-items';

/** Paso 3: lista de especies con buscador. */
@Component({
  selector: 'app-paso-especie',
  imports: [InfoListComponent],
  templateUrl: './paso-especie.html',
  styleUrls: ['../crear-shared.scss'],
})
export class PasoEspecie implements OnInit {
  items: InfoItem[] = [];
  loading = true;
  seleccionada: string | null = null;

  private readonly data = inject(DndDataService);
  private readonly creador = inject(CreadorService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    const e = this.creador.borrador.especie;
    this.seleccionada = e ? itemId(e) : null;
    try {
      this.items = (await this.data.getRazas()).map(raceToInfoItem);
    } catch (error) {
      console.error('Error cargando especies:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  protected elegir(item: InfoItem): void {
    this.router.navigate(['/crear/especie', item.id]);
  }
}
