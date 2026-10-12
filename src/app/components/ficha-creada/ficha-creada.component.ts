import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { InfoCardComponent, InfoItem } from '../info-card/info-card.component';
import { DndDataService } from '../../services/dnd-data.service';
import { EntryProcessorService } from '../../services/entry-processor.service';
import { Ficha } from '../../services/ficha.service';
import { PersonajeCreado } from '../../models/personaje.model';
import { ItemData } from '../../models/dnd-data';
import { ABILITY_KEYS, ABILITY_SHORT, AbilityKey, formatModifier, formatSizes } from '../../utils/dnd-text';
import { hechizoToInfoItem, itemToInfoItem } from '../../utils/info-items';
import {
  EspacioConjuro,
  GrupoNivel,
  agruparPorNivel,
  parsearEspacios,
  unirEquipo,
} from '../../utils/ficha-vista';

type Pestana = 'resumen' | 'habilidades' | 'hechizos' | 'equipo' | 'rasgos' | 'mas';

/** Objeto del equipo: siempre con su nombre y cantidad, y con descripción si existe en los datos. */
export interface ObjetoEquipo {
  item: InfoItem;
  cantidad: number;
  /** Si tiene texto que desplegar (los objetos sin descripción se muestran como una fila fija). */
  descripcion: boolean;
}

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

  protected pestana: Pestana = 'resumen';
  protected rasgos: InfoItem[] = [];
  /** Hechizos de la clase y de dotes juntos, por nivel. */
  protected hechizosPorNivel: GrupoNivel<InfoItem>[] = [];
  protected equipo: ObjetoEquipo[] = [];
  protected cargando = true;

  private readonly data = inject(DndDataService);
  private readonly entryProcessor = inject(EntryProcessorService);
  private readonly cdr = inject(ChangeDetectorRef);
  private carga = 0;
  /** Nivel de cada hechizo por tarjeta, para poder agruparlas. */
  private niveles = new Map<string, number | null>();

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

  /** Busca el texto de cada hechizo y objeto; mientras carga (o si falla) se muestran solo los nombres. */
  private async cargarTarjetas(): Promise<void> {
    const sinDatos = (name: string, badges?: string[]): InfoItem => ({
      id: name,
      name,
      source: '',
      badges,
      entries: [],
    });
    const elementosEquipo = unirEquipo(this.ficha.equipo);
    const carga = ++this.carga;
    this.cargando = true;

    let spells: Awaited<ReturnType<DndDataService['getHechizos']>> = [];
    let objetos: ItemData[] = [];
    try {
      [spells, objetos] = await Promise.all([this.data.getHechizos(), this.data.getObjetos()]);
    } catch (error) {
      console.error('Error cargando hechizos y objetos de la ficha:', error);
    }
    // Si la ficha cambió mientras se cargaba, esta respuesta ya no vale.
    if (carga !== this.carga) return;

    // Hechizos de la clase (sin etiqueta) y de dotes (con el origen como etiqueta), todos juntos.
    this.niveles = new Map();
    const hechizo = (nombre: string, origen?: string): InfoItem => {
      const s = spells.find((x) => x.name === nombre);
      const base = s ? hechizoToInfoItem(s, this.entryProcessor.getSchoolName(s.school)) : sinDatos(nombre);
      const item: InfoItem = { ...base, id: `${base.id}|${origen ?? 'clase'}`, badges: origen ? [origen] : undefined };
      this.niveles.set(item.id, s ? s.level : null);
      return item;
    };
    this.hechizosPorNivel = agruparPorNivel(
      [
        ...this.personaje.hechizos.map((n) => hechizo(n)),
        ...this.ficha.hechizosDotes.map((h) => hechizo(h.nombre, h.origen)),
      ],
      (i) => this.niveles.get(i.id) ?? null,
      (i) => i.name,
    );

    // Equipo: se busca cada objeto por nombre, prefiriendo la edición 2024.
    const buscar = (nombre: string) =>
      objetos.find((o) => o.name.toLowerCase() === nombre.toLowerCase() && o.source === 'XPHB') ??
      objetos.find((o) => o.name.toLowerCase() === nombre.toLowerCase());
    this.equipo = elementosEquipo.map(({ nombre, cantidad }) => {
      const objeto = buscar(nombre);
      const item: InfoItem = objeto ? { ...itemToInfoItem(objeto, this.data) } : sinDatos(nombre);
      item.id = `${item.id}|${nombre}`;
      item.name = nombre;
      item.badges = [...(cantidad > 1 ? [`×${cantidad}`] : [])];
      return { item, cantidad, descripcion: item.entries.length > 0 };
    });

    this.cargando = false;
    this.cdr.detectChanges();
    this.cdr.markForCheck();
  }

  private nivelDe(item: InfoItem): number {
    return parseInt(item.badges?.[0]?.replace('Nivel ', '') ?? '0', 10);
  }

  // ---------------------------------------------------------------- Pestañas

  /** Pestañas visibles: Hechizos solo aparece si el personaje lanza conjuros o tiene hechizos. */
  protected get pestanas(): { id: Pestana; etiqueta: string }[] {
    const lanza = !!this.ficha.lanzamiento || this.personaje.hechizos.length > 0 || this.ficha.hechizosDotes.length > 0;
    return [
      { id: 'resumen', etiqueta: 'Resumen' },
      { id: 'habilidades', etiqueta: 'Habilidades' },
      ...(lanza ? [{ id: 'hechizos' as const, etiqueta: 'Hechizos' }] : []),
      { id: 'equipo', etiqueta: 'Equipo' },
      { id: 'rasgos', etiqueta: 'Rasgos' },
      { id: 'mas', etiqueta: 'Más' },
    ];
  }

  /** Pestaña que se muestra; si la elegida ya no existe (p. ej. Hechizos) se vuelve al resumen. */
  protected get activa(): Pestana {
    return this.pestanas.some((p) => p.id === this.pestana) ? this.pestana : 'resumen';
  }

  protected elegirPestana(id: Pestana, boton?: Element): void {
    this.pestana = id;
    // En pantallas estrechas la barra se desplaza: la pestaña elegida debe quedar a la vista.
    boton?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  /** Flechas izquierda/derecha, Inicio y Fin mueven el foco entre pestañas (patrón WAI-ARIA). */
  protected teclaPestana(event: KeyboardEvent): void {
    const ids = this.pestanas.map((p) => p.id);
    const actual = ids.indexOf(this.activa);
    const destino =
      event.key === 'ArrowRight'
        ? (actual + 1) % ids.length
        : event.key === 'ArrowLeft'
          ? (actual - 1 + ids.length) % ids.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? ids.length - 1
              : -1;
    if (destino < 0) return;
    event.preventDefault();
    this.pestana = ids[destino];
    const botones = (event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[role="tab"]');
    // El botón de la nueva pestaña se enfoca tras renderizar el cambio.
    queueMicrotask(() => botones[destino]?.focus());
    this.cdr.markForCheck();
  }

  // ------------------------------------------------------------------ Datos

  protected salvacion(clave: AbilityKey) {
    return this.ficha.salvaciones.find((s) => s.clave === clave)!;
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

  protected get espacios(): EspacioConjuro[] {
    return parsearEspacios(this.ficha.lanzamiento?.espacios);
  }

  /** Leyenda de los puntos de las habilidades: solo los que aparecen en este personaje. */
  protected get leyenda(): string[] {
    const h = this.ficha.habilidades;
    return [
      '● competente',
      ...(h.some((x) => x.experto) ? ['◆ Expertise'] : []),
      ...(h.some((x) => x.mediaCompetencia) ? ['◐ mitad de competencia'] : []),
      '○ sin competencia',
    ];
  }

  protected get cd(): number | null {
    const l = this.ficha.lanzamiento;
    return l?.habilidad ? 8 + this.ficha.bonusCompetencia + this.ficha.mods[l.habilidad] : null;
  }

  protected get ataqueConjuro(): number | null {
    const l = this.ficha.lanzamiento;
    return l?.habilidad ? this.ficha.bonusCompetencia + this.ficha.mods[l.habilidad] : null;
  }
}
