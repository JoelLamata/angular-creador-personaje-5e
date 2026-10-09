import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionModule } from 'primeng/accordion';
import { SafeHtml } from '@angular/platform-browser';
import { EntryProcessorService } from '../../services/entry-processor.service';

/** Elemento mostrable en una tarjeta genérica (especie, trasfondo, dote, objeto...). */
export interface InfoItem {
  id: string;
  name: string;
  source: string;
  /** Texto corto bajo el nombre. */
  summary?: string;
  /** Valor del filtro de categoría. */
  category?: string;
  badges?: string[];
  entries: any[];
  /** Datos propios de cada página (para las acciones del asistente). */
  data?: any;
}

@Component({
  selector: 'app-info-card',
  standalone: true,
  imports: [CommonModule, AccordionModule],
  templateUrl: './info-card.component.html',
  styleUrl: './info-card.component.scss',
})
export class InfoCardComponent {
  @Input({ required: true }) item!: InfoItem;
  @Input() selectable = false;
  @Input() selected = false;
  @Output() choose = new EventEmitter<InfoItem>();

  protected entryProcessor = inject(EntryProcessorService);
  protected open = false;
  private html: SafeHtml | null = null;

  protected get content(): SafeHtml {
    if (!this.html) {
      this.html = this.entryProcessor.processEntries(this.item.entries);
    }
    return this.html;
  }

  protected onValueChange(value: unknown): void {
    this.open = value === 0;
  }

  protected onChoose(event: Event): void {
    event.stopPropagation();
    this.choose.emit(this.item);
  }
}
