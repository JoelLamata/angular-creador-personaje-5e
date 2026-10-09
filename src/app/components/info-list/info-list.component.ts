import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
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
  /** Permite marcar varias categorías a la vez (se muestran como botones en lugar de un desplegable). */
  @Input() categoriaMultiple = false;
  @Input() placeholder = 'Buscar...';
  /** Muestra la cabecera (se oculta cuando la lista va dentro del asistente). */
  @Input() mostrarCabecera = true;
  @Input() selectable = false;
  @Input() selectedId: string | null = null;
  /** Para listas de selección múltiple. */
  @Input() selectedIds: string[] = [];
  /** Elementos que no se pueden elegir ahora mismo (p. ej. al llegar al máximo). */
  @Input() disabledIds: string[] = [];
  @Output() choose = new EventEmitter<InfoItem>();

  searchText = '';
  selectedCategory: string | null = null;
  selectedCategories: string[] = [];
  selectedSource: string | null = null;
  categories: string[] = [];
  sources: string[] = [];
  filtered: InfoItem[] = [];
  visibleCount = PAGE_SIZE;

  ngOnChanges(changes: SimpleChanges): void {
    // Cambiar la selección no debe reiniciar los filtros ni la paginación de la lista.
    if (!changes['items']) return;
    this.categories = [...new Set(this.items.map((i) => i.category).filter((c): c is string => !!c))].sort(
      (a, b) => a.localeCompare(b, undefined, { numeric: true }),
    );
    this.sources = [...new Set(this.items.map((i) => i.source))].sort((a, b) => a.localeCompare(b));
    this.selectedCategories = this.selectedCategories.filter((c) => this.categories.includes(c));
    this.applyFilters();
  }

  toggleCategory(categoria: string): void {
    this.selectedCategories = this.selectedCategories.includes(categoria)
      ? this.selectedCategories.filter((c) => c !== categoria)
      : [...this.selectedCategories, categoria];
    this.applyFilters();
  }

  applyFilters(): void {
    const text = this.searchText.trim().toLowerCase();
    this.filtered = this.items.filter(
      (i) =>
        (!this.selectedCategory || i.category === this.selectedCategory) &&
        (this.selectedCategories.length === 0 || this.selectedCategories.includes(i.category ?? '')) &&
        (!this.selectedSource || i.source === this.selectedSource) &&
        (!text || i.name.toLowerCase().includes(text)),
    );
    this.visibleCount = PAGE_SIZE;
  }

  clearFilters(): void {
    this.searchText = '';
    this.selectedCategory = null;
    this.selectedCategories = [];
    this.selectedSource = null;
    this.applyFilters();
  }

  showMore(): void {
    this.visibleCount += PAGE_SIZE;
  }

  get hasFilters(): boolean {
    return !!(
      this.searchText ||
      this.selectedCategory ||
      this.selectedCategories.length ||
      this.selectedSource
    );
  }
}
