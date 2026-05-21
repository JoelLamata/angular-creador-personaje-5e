import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { JsonReader } from '../json-reader';
import { AccordionModule } from 'primeng/accordion';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ALLOWED_SOURCES } from '../sourcesConfigService';
import {
  ClassFeatureCardComponent,
  ClassFeature,
} from '../components/class-feature-card/class-feature-card.component';

@Component({
  selector: 'app-clases',
  imports: [
    CommonModule,
    FormsModule,
    AccordionModule,
    ButtonModule,
    InputTextModule,
    ClassFeatureCardComponent,
  ],
  templateUrl: './clases.html',
  styleUrl: './clases.scss',
  standalone: true,
})
export class Clases implements OnInit {
  allClassFeatures: ClassFeature[] = [];
  filteredClassFeatures: ClassFeature[] = [];
  availableLevels: number[] = [];
  availableClass: string[] = [];
  availableSources: string[] = [];
  selectedLevel: number | null = null;
  selectedClass: string | null = null;
  selectedSource: string | null = null;
  searchText: string = '';

  private cdr = inject(ChangeDetectorRef);
  private readonly jsonReader = inject(JsonReader);

  async ngOnInit(): Promise<void> {
    await this.loadAllClassFeatures();
    this.applyFilters();
  }

  /**
   * Load all class features from all classes
   */
  private async loadAllClassFeatures(): Promise<void> {
    try {
      const classData = await this.jsonReader.getClassData();
      console.log('Classdata: ', classData);

      const filteredFeatures = classData.filter((feature: any) =>
        ALLOWED_SOURCES.includes(feature.source),
      );

      this.allClassFeatures.push(...filteredFeatures);
      console.log('allClassFeatures: ', this.allClassFeatures);

      // Extract unique levels for filter dropdown
      const levelSet = new Set(this.allClassFeatures.map((f) => f.level));
      this.availableLevels = Array.from(levelSet).sort((a, b) => a - b);
      console.log('availableLevels: ', this.availableLevels);

      // Extract unique class for filter dropdown
      const classSet = new Set(this.allClassFeatures.map((f) => f.className));
      this.availableClass = Array.from(classSet).sort((a, b) => a.localeCompare(b));
      console.log('availableClass: ', this.availableClass);

      // Extract unique source for filter dropdown
      const classSource = new Set(this.allClassFeatures.map((f) => f.source));
      this.availableSources = Array.from(classSource).sort((a, b) => a.localeCompare(b));
      console.log('availableSources: ', this.availableSources);

      // Sort by level then by name
      this.allClassFeatures.sort((a, b) => {
        if (a.level !== b.level) return a.level - b.level;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error loading class features:', error);
    } finally {
      this.cdr.detectChanges();
      console.log('loaded');
    }
  }

  /**
   * Apply filters: level and search text
   */
  applyFilters(): void {
    let filtered = [...this.allClassFeatures];

    // Filter by level if selected
    if (this.selectedLevel !== null) {
      filtered = filtered.filter((f) => f.level === this.selectedLevel);
    }
    // Filter by class if selected
    if (this.selectedClass !== null) {
      filtered = filtered.filter((f) => f.className === this.selectedClass);
    }
    // Filter by source if selected
    if (this.selectedSource !== null) {
      filtered = filtered.filter((f) => f.source === this.selectedSource);
    }

    // Filter by search text
    if (this.searchText && this.searchText.trim()) {
      const searchLower = this.searchText.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.name.toLowerCase().includes(searchLower) ||
          f.className.toLowerCase().includes(searchLower) ||
          f.source.toLowerCase().includes(searchLower),
      );
    }

    this.filteredClassFeatures = filtered;
  }

  /**
   * Handle search input
   */
  onSearchChange(): void {
    this.applyFilters();
  }

  /**
   * Handle filter change
   */
  onFilterChange(): void {
    this.applyFilters();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.selectedLevel = null;
    this.searchText = '';
    this.applyFilters();
  }
}
