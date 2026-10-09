import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { InfoListComponent } from '../components/info-list/info-list.component';
import { InfoItem } from '../components/info-card/info-card.component';
import { DndDataService } from '../services/dnd-data.service';
import { featToInfoItem } from '../utils/info-items';

@Component({
  selector: 'app-dotes',
  imports: [InfoListComponent],
  templateUrl: './dotes.html',
})
export class Dotes implements OnInit {
  items: InfoItem[] = [];
  loading = true;

  private readonly data = inject(DndDataService);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    try {
      this.items = (await this.data.getDotes()).map(featToInfoItem);
    } catch (error) {
      console.error('Error cargando dotes:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }
}
