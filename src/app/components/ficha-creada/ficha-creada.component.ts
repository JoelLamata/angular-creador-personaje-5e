import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { InfoCardComponent, InfoItem } from '../info-card/info-card.component';
import { DndDataService } from '../../services/dnd-data.service';
import { EntryProcessorService } from '../../services/entry-processor.service';
import { Ficha } from '../../services/ficha.service';
import { PersonajeCreado } from '../../models/personaje.model';
import { ABILITY_KEYS, ABILITY_SHORT, formatModifier, formatSizes } from '../../utils/dnd-text';
import { resolverDote } from '../../utils/dotes';
import { featToInfoItem, hechizoToInfoItem } from '../../utils/info-items';

/** Ficha de solo lectura de un personaje creado (resumen del asistente y página del personaje). */
@Component({
  selector: 'app-ficha-creada',
  standalone: true,
  imports: [InfoCardComponent],
  templateUrl: './ficha-creada.component.html',
  styleUrl: './ficha-creada.component.scss',
})
export class FichaCreadaComponent implements OnChanges {
  @Input({ required: true }) ficha!: Ficha;
  @Input({ required: true }) personaje!: PersonajeCreado;

  protected readonly claves = ABILITY_KEYS;
  protected readonly cortos = ABILITY_SHORT;
  protected readonly fmt = formatModifier;
  protected rasgos: InfoItem[] = [];
  /** Hechizos, hechizos de dotes y dotes como tarjetas desplegables, igual que en el asistente. */
  protected hechizos: InfoItem[] = [];
  protected hechizosDotes: InfoItem[] = [];
  protected dotes: InfoItem[] = [];

  private readonly data = inject(DndDataService);
  private readonly entryProcessor = inject(EntryProcessorService);
  private readonly cdr = inject(ChangeDetectorRef);
  private carga = 0;

  ngOnChanges(): void {
    const aItem = (f: { name: string; level: number; source: string; entries?: any[] }, extra?: string): InfoItem => ({
      id: `${f.name}|${f.level}|${extra ?? ''}`,
      name: f.name,
      source: f.source,
      badges: [`Nivel ${f.level}`, ...(extra ? [extra] : [])],
      entries: f.entries ?? [],
    });
    const sub = this.personaje.subclase?.shortName;
    this.rasgos = [
      ...this.ficha.rasgosClase.map((f) => aItem(f)),
      ...this.ficha.rasgosSubclase.map((f) => aItem(f, sub)),
    ].sort((a, b) => this.nivelDe(a) - this.nivelDe(b));
    void this.cargarTarjetas();
  }

  /** Busca el texto de cada hechizo y dote; mientras carga (o si falla) se muestran solo los nombres. */
  private async cargarTarjetas(): Promise<void> {
    const sinDatos = (name: string, badges?: string[]): InfoItem => ({ id: name, name, source: '', badges, entries: [] });
    this.hechizos = this.personaje.hechizos.map((n) => sinDatos(n));
    this.hechizosDotes = this.ficha.hechizosDotes.map((h) => sinDatos(h.nombre, [h.origen]));
    this.dotes = this.ficha.dotes.map((n) => sinDatos(n));

    const carga = ++this.carga;
    try {
      const [spells, feats] = await Promise.all([this.data.getHechizos(), this.data.getDotes()]);
      // Si la ficha cambió mientras se cargaba, esta respuesta ya no vale.
      if (carga !== this.carga) return;

      const hechizo = (nombre: string, origen?: string): InfoItem => {
        const s = spells.find((x) => x.name === nombre);
        if (!s) return sinDatos(nombre, origen ? [origen] : undefined);
        const item = hechizoToInfoItem(s, this.entryProcessor.getSchoolName(s.school));
        return origen ? { ...item, id: `${item.id}|${origen}`, badges: [origen] } : item;
      };
      const nivel = (i: InfoItem) => spells.find((x) => x.name === i.name)?.level ?? 99;
      this.hechizos = this.personaje.hechizos
        .map((n) => hechizo(n))
        .sort((a, b) => nivel(a) - nivel(b) || a.name.localeCompare(b.name));
      this.hechizosDotes = this.ficha.hechizosDotes.map((h) => hechizo(h.nombre, h.origen));
      this.dotes = this.ficha.dotes.map((nombre) => {
        const r = resolverDote(feats, nombre);
        return r ? { ...featToInfoItem(r.feat), name: nombre } : sinDatos(nombre);
      });
    } catch (error) {
      console.error('Error cargando hechizos y dotes de la ficha:', error);
    }
    this.cdr.detectChanges();
    this.cdr.markForCheck();
  }

  private nivelDe(item: InfoItem): number {
    return parseInt(item.badges?.[0]?.replace('Nivel ', '') ?? '0', 10);
  }

  protected get subtitulo(): string {
    const p = this.personaje;
    const clase = p.clase ? `${p.clase.name} ${p.nivel}${p.subclase ? ' (' + p.subclase.shortName + ')' : ''}` : 'Sin clase';
    const especie = p.especie ? p.especie.name + (p.linaje ? ` (${p.linaje})` : '') : 'Sin especie';
    return `${clase} · ${especie} · ${p.trasfondo?.name ?? 'Sin trasfondo'}`;
  }

  protected get tamano(): string {
    return this.personaje.tamano ? formatSizes([this.personaje.tamano]) : '';
  }

  protected get habilidadesCompetentes(): string[] {
    return this.ficha.habilidades.filter((h) => h.competente).map((h) => h.nombre);
  }
}
