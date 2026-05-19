import { Component, Input, inject } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { AccordionModule } from 'primeng/accordion';
import { EntryProcessorService } from '../../services/entry-processor.service';

export type PlayerActionType = 'action' | 'bonus' | 'reaction' | 'other';

@Component({
  selector: 'app-player-action',
  standalone: true,
  imports: [AccordionModule],
  templateUrl: './player-action.component.html',
  styleUrl: './player-action.component.scss',
})
export class PlayerActionComponent {
  @Input() action: any;
  @Input() type: PlayerActionType = 'action';
  @Input() name = '';
  @Input() description: string | SafeHtml = '';
  @Input() attack = '';
  @Input() damage = '';

  private readonly entryProcessor = inject(EntryProcessorService);

  get displayName(): string {
    return this.name || this.action?.name || 'Acción';
  }

  get typeLabel(): string {
    if (this.type === 'action') {
      return 'Acción'
    } if (this.type === 'bonus') {
      return 'Acción adicional'
    } if (this.type === 'reaction') {
      return 'Reacción'
    } if (this.type === 'other') {
      return 'Otros'
    }
    return '';
  }

  get displayAttack(): string {
    return this.attack || this.action?.attack || '';
  }

  get displayDamage(): string {
    return this.damage || this.action?.damage || this.action?.dice?.diceString || '';
  }

  get descriptionHtml(): SafeHtml | string {
    if (this.description) return this.description;
    if (this.action?.entries) return this.entryProcessor.processEntry({ type: 'entries', entries: this.action.entries });
    if (this.action?.snippet) return this.action.snippet;
    return this.action?.description || '';
  }
}
