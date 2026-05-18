import { Component, Input, inject } from '@angular/core';
import { SafeHtml } from '@angular/platform-browser';
import { EntryProcessorService } from '../../services/entry-processor.service';

@Component({
  selector: 'app-spell',
  standalone: true,
  templateUrl: './spell.component.html',
  styleUrl: './spell.component.scss',
})
export class SpellComponent {
  @Input() spell: any;
  @Input() prepared = true;

  private readonly entryProcessor = inject(EntryProcessorService);

  get levelLabel(): string {
    const level = this.spell?.level ?? 0;
    return level === 0 ? 'Truco' : `Nivel ${level}`;
  }

  get schoolLabel(): string {
    return this.entryProcessor.getSchoolName(this.spell?.school ?? '');
  }

  get castingTime(): string {
    const time = this.spell?.time?.[0];
    if (!time) return 'N/D';
    return `${time.number} ${this.translateUnit(time.unit)}`;
  }

  get range(): string {
    const distance = this.spell?.range?.distance;
    if (!distance) return 'N/D';
    if (distance.type === 'self') return 'Personal';
    if (distance.type === 'touch') return 'Toque';
    if (distance.amount) return `${this.feetToMeters(distance.amount)}m`;
    return distance.type;
  }

  get components(): string {
    const components = this.spell?.components;
    if (!components) return 'N/D';
    const values = [];
    if (components.v) values.push('V');
    if (components.s) values.push('S');
    if (components.m) values.push('M');
    return values.join(', ');
  }

  get duration(): string {
    const duration = this.spell?.duration?.[0];
    if (!duration) return 'N/D';
    const prefix = duration.concentration ? 'Concentración, hasta ' : '';
    if (duration.type === 'instant') return 'Instantáneo';
    if (duration.duration) return `${prefix}${duration.duration.amount} ${this.translateUnit(duration.duration.type)}`;
    return duration.type;
  }

  get descriptionHtml(): SafeHtml {
    return this.entryProcessor.processEntry({ type: 'entries', entries: this.spell?.entries ?? [] });
  }

  private translateUnit(unit: string): string {
    const units: Record<string, string> = {
      action: 'acción',
      bonus: 'acción adicional',
      reaction: 'reacción',
      minute: 'minuto',
      hour: 'hora',
      day: 'día',
      round: 'turno',
    };
    return units[unit] ?? unit;
  }

  private feetToMeters(feet: number): number {
    return Math.round(feet * 0.3048);
  }
}
