import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Spell } from './types';
import { HechizosService } from './hechizos.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-hechizos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hechizos.html',
  styleUrl: './hechizos.css',
})
export class Hechizos implements OnInit, OnDestroy {
  spells: Spell[] = [];
  filteredSpells: Spell[] = [];

  loading = true;
  searchQuery = '';
  selectedLevel: number | null = null;
  private sub?: Subscription;

  constructor(
    private hechizosService: HechizosService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit() {
    this.sub = this.hechizosService.spells$.subscribe((spells) => {
      this.spells = spells;
      this.applyFilters();
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  async onSearch(query: string) {
    this.searchQuery = query;

    this.applyFilters();
  }

  async filterByLevel(level: number | null) {
    this.selectedLevel = level;

    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredSpells = this.spells.filter((s) => {
      const levelAllowed = this.selectedLevel === null ? true : s.level === this.selectedLevel;

      const search = this.searchQuery.toLowerCase().trim();

      const isSearched = search ? s.name_en.toLowerCase().includes(search) : true;

      return levelAllowed && isSearched;
    });
  }

  onLevelChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.filterByLevel(value ? +value : null);
  }
}
