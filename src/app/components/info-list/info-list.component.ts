import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { InfoCardComponent, InfoItem } from '../info-card/info-card.component';

const PAGE_SIZE = 40;

/** Página de consulta genérica: cabecera, buscador, filtros y lista de tarjetas. */
@Component({
  selector: 'app-info-list',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule, InfoCardComponent],
  templateUrl: './info-list.component.html',
  styleUrl: './info-list.component.scss',
})
export class InfoListComponent implements OnChanges {
  @Input() titulo = '';
  @Input() descripcion = '';
  @Input() items: InfoItem[] = [];
  @Input() loading = false;
  @Input() categoriaEtiqueta = 'Categoría';
  @Input() placeholder = 'Buscar...';
  /** Muestra la cabecera (se oculta cuando la lista va dentro del asistente). */
  @Input() mostrarCabecera = true;
  @Input() selectable = false;
  @Input() selectedId: string | null = null;
  /** Para listas de selección múltiple. */
  @Input() selectedIds: string[] = [];
  @Output() choose = new EventEmitter<InfoItem>();

  searchText = '';
  selectedCategory: string | null = null;
  selectedSource: string | null = null;
  categories: string[] = [];
  sources: string[] = [];
  filtered: InfoItem[] = [];
  visibleCount = PAGE_SIZE;

  ngOnChanges(): void {
    this.categories = [...new Set(this.items.map((i) => i.category).filter((c): c is string => !!c))].sort(
      (a, b) => a.localeCompare(b),
    );
    this.sources = [...new Set(this.items.map((i) => i.source))].sort((a, b) => a.localeCompare(b));
    this.applyFilters();
  }

  applyFilters(): void {
    const text = this.searchText.trim().toLowerCase();
    this.filtered = this.items.filter(
      (i) =>
        (!this.selectedCategory || i.category === this.selectedCategory) &&
        (!this.selectedSource || i.source === this.selectedSource) &&
        (!text || i.name.toLowerCase().includes(text)),
    );
    this.visibleCount = PAGE_SIZE;
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedCategory = null;
    this.selectedSource = null;
    this.applyFilters();
  }

  showMore(): void {
    this.visibleCount += PAGE_SIZE;
  }

  get hasFilters(): boolean {
    return !!(this.searchText || this.selectedCategory || this.selectedSource);
  }
}
