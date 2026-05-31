import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionModule } from 'primeng/accordion';
import { EntryProcessorService } from '../../services/entry-processor.service';

export interface ClassFeature {
  name: string;
  className: string;
  classSource: string;
  level: number;
  source: string;
  entries: any[];
  subclassShortName?: string;
  page?: number;
  srd?: boolean;
}

@Component({
  selector: 'app-class-feature-card',
  standalone: true,
  imports: [CommonModule, AccordionModule],
  templateUrl: './class-feature-card.component.html',
  styleUrl: './class-feature-card.component.scss'
})
export class ClassFeatureCardComponent {
  @Input() feature!: ClassFeature;
  @Input() index: number = 0;

  protected entryProcessor = inject(EntryProcessorService);

  /**
   * Returns the CSS variable name for the class color
   * Example: 'barbarian' => '--player-class-barbarian'
   */
  getClassColorVar(): string {
    const className = this.feature.className.toLowerCase().replace(/\s+/g, '');
    return `var(--player-class-${className})`;
  }

  /**
   * Returns a normalized class name for styling
   */
  getNormalizedClassName(): string {
    return this.feature.className.toLowerCase().replace(/\s+/g, '-');
  }
}
