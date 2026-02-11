import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JsonReader } from '../json-reader';
import { Router } from '@angular/router';
import { PRIMENG_IMPORTS } from '../primeng.imports';
import { ALLOWED_SOURCES } from '../sourcesConfigService';

@Component({
  selector: 'app-clases-detalle',
  imports: [PRIMENG_IMPORTS],
  templateUrl: './clases-detalle.html',
  styleUrl: './clases-detalle.css',
})
export class ClasesDetalle implements OnInit {
  ALLOWED_SOURCES = ALLOWED_SOURCES;
  selectedLevel: number | null = null;
  page!: string;
  clases: any[] = [];
  subclases: any[] = [];
  classFeatures: any[] = [];
  filteredClassFeatures: any[] = [];
  subclassFeatures: any[] = [];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly jsonReader: JsonReader
  ) {}

  async ngOnInit(): Promise<void> {
    this.page = this.route.snapshot.paramMap.get('page')!;

    const result = await this.jsonReader.getPageData('class/', this.page);

    this.clases = result.class.filter((c: any) =>
      ALLOWED_SOURCES.includes(c.source)
    );

    this.subclases = result.subclass.filter((c: any) =>
      ALLOWED_SOURCES.includes(c.source)
    );

    this.classFeatures = result.classFeature.filter((c: any) =>
      ALLOWED_SOURCES.includes(c.source)
    );

    this.subclassFeatures = result.subclassFeature.filter((c: any) =>
      ALLOWED_SOURCES.includes(c.source)
    );

    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredClassFeatures = this.classFeatures.filter(c => {

      // Filtro por allowed sources
      const sourceAllowed = ALLOWED_SOURCES.includes(c.source);

      // Filtro por nivel
      const levelAllowed =
        this.selectedLevel == null || this.selectedLevel === undefined
          ? true
          : c.level <= this.selectedLevel;

      return sourceAllowed && levelAllowed;
    });
  }

  goBack() {
    this.router.navigate(['/clases']);
  }
}
