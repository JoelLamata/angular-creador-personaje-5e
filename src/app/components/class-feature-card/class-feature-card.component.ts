import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionModule } from 'primeng/accordion';
import { SafeHtml } from '@angular/platform-browser';
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
  private html: SafeHtml | null = null;

  /** HTML de las entradas, calculado una sola vez por tarjeta. */
  protected get content(): SafeHtml {
    if (!this.html) {
      this.html = this.entryProcessor.processEntries(this.feature.entries);
    }
    return this.html;
  }

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
