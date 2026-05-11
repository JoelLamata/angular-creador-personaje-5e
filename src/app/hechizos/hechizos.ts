import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Spell } from './types';
import { HechizosService } from './hechizos.service';

@Component({
  selector: 'app-hechizos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './hechizos.html',
  styleUrl: './hechizos.css',
})
export class Hechizos implements OnInit {
  spells: Spell[] = [];
  filteredSpells: Spell[] = [];

  loading = true;
  searchQuery = '';
  selectedLevel: number | null = null;
  showLegacy: boolean = false;

  constructor(private hechizosService: HechizosService) {}

  async ngOnInit() {
    this.spells = await this.hechizosService.getAllSpells();
    this.filteredSpells = this.spells;
    this.loading = false;
    this.applyFilters();
  }

  async onSearch(query: string) {
    this.searchQuery = query;

    if (!query.trim()) {
      this.applyFilters();
      return;
    }

    this.filteredSpells = await this.hechizosService.searchSpells(query);
  }

  async onInit() {
    
  }

  async filterByLevel(level: number | null) {
    this.selectedLevel = level;

    if (level === null) {
      this.filteredSpells = this.spells;
    } else {
      this.filteredSpells =
        await this.hechizosService.getSpellsByLevel(level);
    }
  }

  private applyFilters() {
    let result = [...this.spells];
    if (this.selectedLevel !== null) {
      result = result.filter((s) => s.level === this.selectedLevel);
    }

    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter((s) =>
        (s._search ?? '').includes(q)
      );
    }

    if (!this.showLegacy) {
      result = result.filter((s) => !/2014/i.test(s.source_file))
    }

    this.filteredSpells = result;
  }


  trackBySpell(index: number, spell: Spell) {
    return spell.name_en;
  }

  onLevelChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.filterByLevel(value ? +value : null);
  }

  toggleLegacy() {
    this.showLegacy = !this.showLegacy;
    this.applyFilters();
  }
}
