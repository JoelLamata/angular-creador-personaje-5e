import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JsonReader } from '../json-reader';
import { Router } from '@angular/router';
import { PRIMENG_IMPORTS } from '../primeng.imports';
import { ALLOWED_SOURCES } from '../sourcesConfigService';
import { InputText } from "primeng/inputtext";
import { EntryProcessorService } from '../services/entry-processor.service';


@Component({
  selector: 'app-clases-detalle',
  imports: [PRIMENG_IMPORTS, InputText],
  templateUrl: './clases-detalle.html',
  styleUrl: './clases-detalle.css',
})
export class ClasesDetalle implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  protected entryProcessor = inject(EntryProcessorService);

  ALLOWED_SOURCES = ALLOWED_SOURCES;
  selectedLevel: number | null = null;
  page!: string;
  clases: any[] = [];
  subclases: any[] = [];
  classFeatures: any[] = [];
  filteredClassFeatures: any[] = [];
  subclassFeatures: any[] = [];
  searchText: string = '';

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
    this.cdr.detectChanges();
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

      const search = this.searchText.toLowerCase().trim();

      const isSearched = search != null ? c.name.toLowerCase().startsWith(search) : true;

      return sourceAllowed && levelAllowed && isSearched;
    });
  }

  goBack() {
    this.router.navigate(['/clases']);
  }
}
