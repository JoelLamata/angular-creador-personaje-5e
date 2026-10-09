import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Spell } from './types';
import { HechizosService } from './hechizos.service';
import { EntryProcessorService } from '../services/entry-processor.service';
import { Subscription } from 'rxjs';
import { DndDataService } from '../services/dnd-data.service';

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
  selectedClass: string | null = null;
  classNames: string[] = [];
  private classLists: Record<string, string[]> = {};
  private sub?: Subscription;

  constructor(
    private hechizosService: HechizosService,
    private cdr: ChangeDetectorRef,
    public entryProcessor: EntryProcessorService,
    private dndData: DndDataService,
  ) {}

  async ngOnInit() {
    this.entryProcessor.preloadSchoolIcons();

    try {
      this.classLists = await this.dndData.getListasHechizosPorClase();
      this.classNames = Object.keys(this.classLists).filter((c) => this.classLists[c].length > 5);
      this.cdr.detectChanges();
    } catch {
      this.classNames = [];
    }

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

  onClassChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.selectedClass = value || null;
    this.applyFilters();
  }

  applyFilters(): void {
    const classSpells = this.selectedClass ? new Set(this.classLists[this.selectedClass] ?? []) : null;

    this.filteredSpells = this.spells.filter((s) => {
      const levelAllowed = this.selectedLevel === null ? true : s.level === this.selectedLevel;
      if (classSpells && !classSpells.has(s.name_en)) return false;

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
