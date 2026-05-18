import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-player-stats',
  standalone: true,
  templateUrl: './player-stats.component.html',
  styleUrl: './player-stats.component.scss',
})
export class PlayerStatsComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = '';
  @Input({ required: true }) modifier: string | number = '';
}
