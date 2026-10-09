import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { InfoListComponent } from '../components/info-list/info-list.component';
import { InfoItem } from '../components/info-card/info-card.component';
import { DndDataService } from '../services/dnd-data.service';
import { raceToInfoItem } from '../utils/info-items';

@Component({
  selector: 'app-especies',
  imports: [InfoListComponent],
  templateUrl: './especies.html',
  styleUrl: './especies.css',
})
export class Especies implements OnInit {
  items: InfoItem[] = [];
  loading = true;

  private readonly data = inject(DndDataService);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
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
}
