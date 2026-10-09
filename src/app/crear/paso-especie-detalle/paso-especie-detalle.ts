import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DndDataService } from '../../services/dnd-data.service';
import { CreadorService } from '../../services/creador.service';
import { SafeHtml } from '@angular/platform-browser';
import { DndEntry, RaceInfo } from '../../models/dnd-data';
import { EntryProcessorService } from '../../services/entry-processor.service';
import { eleccionesDeDote, nombresSeleccionables, resolverDote } from '../../utils/dotes';
import { InfoCardComponent, InfoItem } from '../../components/info-card/info-card.component';
import { SKILLS, SIZE_NAMES } from '../../utils/dnd-text';
import { dotesDeTrasfondo, eleccionesHabilidad, habilidadesFijas } from '../../utils/reglas';
import { FEAT_CATEGORIES, raceToInfoItem } from '../../utils/info-items';

/** Paso 4: detalle de la especie elegida y sus opciones. */
@Component({
  selector: 'app-paso-especie-detalle',
  imports: [FormsModule, RouterLink, ButtonModule, InfoCardComponent],
  templateUrl: './paso-especie-detalle.html',
  styleUrls: ['../crear-shared.scss'],
})
export class PasoEspecieDetalle implements OnInit, OnDestroy {
  especie: RaceInfo | null = null;
  item: InfoItem | null = null;
  loading = true;

  linaje: string | null = null;
  tamano: string | null = null;
  habilidades: string[] = [];
  dote: string | null = null;

  opcionesLinaje: string[] = [];
  tamanos: { clave: string; nombre: string }[] = [];
  habilidadesPosibles: string[] = [];
  cuantasHabilidades = 0;
  /** Dotes que puede elegir la especie (vacío si no concede ninguna a elegir). */
  dotesPosibles: string[] = [];
  /** Texto de la dote elegida, preparado una sola vez al cambiar la elección. */
  descripcionDote: SafeHtml | null = null;
  /** La dote elegida pide más decisiones, que se toman en el paso «Rasgos». */
  doteConElecciones = false;

  private dotes: DndEntry[] = [];

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly data = inject(DndDataService);
  private readonly creador = inject(CreadorService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly entryProcessor = inject(EntryProcessorService);
  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe((p) => this.cargar(p.get('id') ?? ''));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private async cargar(id: string): Promise<void> {
    this.loading = true;
    try {
      const [name, source] = id.split('|');
      const [razas, dotes, trasfondos] = await Promise.all([
        this.data.getRazas(),
        this.data.getDotes(),
        this.data.getTrasfondos(),
      ]);
      this.especie = razas.find((r) => r.name === name && r.source === source) ?? null;
      if (this.especie) {
        this.item = raceToInfoItem(this.especie);
        this.inicializar(this.especie, dotes, trasfondos);
      }
    } catch (error) {
      console.error('Error cargando la especie:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  private inicializar(especie: RaceInfo, dotes: DndEntry[], trasfondos: DndEntry[]): void {
    const b = this.creador.borrador;
    this.dotes = dotes;
    const trasfondo = trasfondos.find((t) => t.name === b.trasfondo?.name && t.source === b.trasfondo?.source);
    const misma = b.especie?.name === especie.name && b.especie?.source === especie.source;

    this.opcionesLinaje = [...especie.versions, ...especie.subraces.map((s) => s.name)];
    this.tamanos = ((especie['size'] ?? []) as string[]).map((clave) => ({ clave, nombre: SIZE_NAMES[clave] ?? clave }));

    const elecciones = eleccionesHabilidad(especie['skillProficiencies']);
    this.cuantasHabilidades = elecciones.reduce((n, e) => n + e.count, 0);
    const todas = elecciones.some((e) => e.from === null)
      ? SKILLS
      : [...new Set(elecciones.flatMap((e) => e.from ?? []))];
    // No se ofrecen las habilidades en las que ya eres competente por la clase o el trasfondo.
    const yaCompetentes = new Set([
      ...b.habilidadesClase,
      ...habilidadesFijas(trasfondo?.['skillProficiencies']),
    ]);
    this.habilidadesPosibles = todas.filter((h) => !yaCompetentes.has(h));

    // Dotes que concede la especie a elegir: de una categoría concreta o cualquiera.
    const dotesEspecie: any[] = especie['feats'] ?? [];
    const categorias: string[] = dotesEspecie.flatMap((f) => f.anyFromCategory?.category ?? []);
    const cualquiera = dotesEspecie.some((f) => f.any);
    // Una dote no se puede tomar dos veces, salvo que sea repetible; las variantes (Magic Initiate)
    // cuentan como dotes distintas.
    const delTrasfondo = new Set(trasfondo ? dotesDeTrasfondo(trasfondo) : []);
    this.dotesPosibles = dotes
      .filter((d) => cualquiera || (categorias.length > 0 && categorias.includes(d['category'])))
      .flatMap((d) =>
        nombresSeleccionables(d).filter(
          (n) => !delTrasfondo.has(n) || (d['repeatable'] && nombresSeleccionables(d).length === 1),
        ),
      )
      .filter((n, i, arr) => arr.indexOf(n) === i);

    this.linaje = misma ? b.linaje : null;
    this.tamano = misma ? b.tamano : (this.tamanos.length === 1 ? this.tamanos[0].clave : null);
    this.habilidades = misma ? [...b.habilidadesEspecie] : [];
    this.dote = misma && b.doteEspecie && this.dotesPosibles.includes(b.doteEspecie) ? b.doteEspecie : null;
    this.actualizarDote();
  }

  protected cambiarDote(nombre: string | null): void {
    this.dote = nombre;
    this.actualizarDote();
  }

  private actualizarDote(): void {
    const r = this.dote ? resolverDote(this.dotes, this.dote) : undefined;
    this.descripcionDote = r ? this.entryProcessor.processEntries(r.feat.entries) : null;
    this.doteConElecciones = r ? eleccionesDeDote(r.feat, r.variante, 'especie', 'Especie').length > 0 : false;
  }

  protected get tituloDotes(): string {
    return FEAT_CATEGORIES['O'];
  }

  protected alternarHabilidad(h: string): void {
    if (this.habilidades.includes(h)) {
      this.habilidades = this.habilidades.filter((x) => x !== h);
    } else if (this.habilidades.length < this.cuantasHabilidades) {
      this.habilidades = [...this.habilidades, h];
    }
  }

  protected get completo(): boolean {
    return (
      (this.opcionesLinaje.length === 0 || !!this.linaje) &&
      (this.tamanos.length <= 1 || !!this.tamano) &&
      this.habilidades.length === this.cuantasHabilidades &&
      (this.dotesPosibles.length === 0 || !!this.dote)
    );
  }

  protected confirmar(): void {
    const e = this.especie;
    if (!e || !this.completo) return;
    this.creador.actualizar({
      especie: { name: e.name, source: e.source },
      linaje: this.linaje,
      tamano: this.tamano ?? this.tamanos[0]?.clave ?? null,
      habilidadesEspecie: this.habilidades,
      doteEspecie: this.dote,
    });
    this.router.navigate(['/crear/trasfondo']);
  }
}
