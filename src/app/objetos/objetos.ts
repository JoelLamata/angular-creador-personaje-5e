import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { InfoListComponent } from '../components/info-list/info-list.component';
import { InfoItem } from '../components/info-card/info-card.component';
import { DndDataService } from '../services/dnd-data.service';
import { itemToInfoItem } from '../utils/info-items';

@Component({
  selector: 'app-objetos',
  imports: [InfoListComponent],
  templateUrl: './objetos.html',
})
export class Objetos implements OnInit {
  items: InfoItem[] = [];
  loading = true;

  private readonly data = inject(DndDataService);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    try {
      const objetos = await this.data.getObjetos();
      this.items = objetos.map((o) => itemToInfoItem(o, this.data));
    } catch (error) {
      console.error('Error cargando objetos:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }
}
