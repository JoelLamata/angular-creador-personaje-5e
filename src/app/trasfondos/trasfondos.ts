import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { InfoListComponent } from '../components/info-list/info-list.component';
import { InfoItem } from '../components/info-card/info-card.component';
import { DndDataService } from '../services/dnd-data.service';
import { backgroundToInfoItem } from '../utils/info-items';

@Component({
  selector: 'app-trasfondos',
  imports: [InfoListComponent],
  templateUrl: './trasfondos.html',
  styleUrl: './trasfondos.css',
})
export class Trasfondos implements OnInit {
  items: InfoItem[] = [];
  loading = true;

  private readonly data = inject(DndDataService);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    try {
      this.items = (await this.data.getTrasfondos()).map(backgroundToInfoItem);
    } catch (error) {
      console.error('Error cargando trasfondos:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }
}
