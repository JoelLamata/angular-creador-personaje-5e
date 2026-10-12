import { ChangeDetectorRef, Component, Input, OnChanges, inject } from '@angular/core';
import { AccionesFichaComponent } from '../acciones-ficha/acciones-ficha.component';
import { InfoCardComponent, InfoItem } from '../info-card/info-card.component';
import { AccionesService, GrupoAccion } from '../../services/acciones.service';
import { DndDataService } from '../../services/dnd-data.service';
import { EntryProcessorService } from '../../services/entry-processor.service';
import { Ficha } from '../../services/ficha.service';
import { PersonajeCreado } from '../../models/personaje.model';
import { ItemData } from '../../models/dnd-data';
import { ABILITY_KEYS, ABILITY_SHORT, AbilityKey, formatModifier, formatSizes } from '../../utils/dnd-text';
import { hechizoToInfoItem, itemToInfoItem } from '../../utils/info-items';
import { Recurso, recursosDe } from '../../utils/recursos';
import {
  EspacioConjuro,
  agruparConEspacios,
  normalizarCasillas,
  parsearEspacios,
  unirEquipo,
} from '../../utils/ficha-vista';

type Pestana = 'resumen' | 'habilidades' | 'acciones' | 'hechizos' | 'equipo' | 'rasgos' | 'mas';

/** Objeto del equipo: siempre con su nombre y cantidad, y con descripción si existe en los datos. */
export interface ObjetoEquipo {
  item: InfoItem;
  cantidad: number;
  /** Si tiene texto que desplegar (los objetos sin descripción se muestran como una fila fija). */
  descripcion: boolean;
}

/** Grupo de hechizos de un nivel, con las casillas de espacios de conjuro de ese nivel. */
export interface GrupoHechizos {
  nivel: number | null;
  titulo: string;
  espacios: number;
  items: InfoItem[];
}

/** Ficha de solo lectura de un personaje creado (resumen del asistente y página del personaje). */
@Component({
  selector: 'app-ficha-creada',
  standalone: true,
  imports: [InfoCardComponent, AccionesFichaComponent],
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
  /** Hechizos de la clase y de dotes juntos, por nivel (los que mejoran se repiten en niveles superiores). */
  protected hechizosPorNivel: GrupoHechizos[] = [];
  /** Espacios de conjuro gastados por nivel; se guardan solo en este dispositivo. */
  protected casillas: Record<number, boolean[]> = {};
  protected equipo: ObjetoEquipo[] = [];
  /** Qué puede hacer el personaje en su turno: acción, acción adicional, reacción y otros. */
  protected acciones: GrupoAccion[] = [];
  /** Recursos con usos limitados de la clase (furias, inspiración, puntos...). */
  protected recursos: Recurso[] = [];
  protected cargando = true;

  private readonly data = inject(DndDataService);
  private readonly entryProcessor = inject(EntryProcessorService);
  private readonly accionesService = inject(AccionesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private carga = 0;
  /** Nivel de cada hechizo por tarjeta y si mejora con espacios superiores, para poder agruparlas. */
  private niveles = new Map<string, { nivel: number | null; mejorable: boolean }>();

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
    this.recursos = recursosDe(this.ficha.clase, this.ficha.subclase, this.personaje.nivel, this.ficha.mods);
    this.cargarCasillas();
    void this.cargarTarjetas();
  }

  // ------------------------------------------------------- Espacios de conjuro

  private get claveCasillas(): string {
    return `ficha-espacios-gastados:${this.personaje.id ?? 'borrador'}`;
  }

  /** Lee del dispositivo qué espacios están gastados; sin almacenamiento (o con datos rotos) todos libres. */
  private cargarCasillas(): void {
    let guardado: Record<string, unknown> = {};
    try {
      guardado = JSON.parse(localStorage.getItem(this.claveCasillas) ?? '{}') ?? {};
    } catch {
      guardado = {};
    }
    this.casillas = Object.fromEntries(this.espacios.map((e) => [e.nivel, normalizarCasillas(guardado[e.nivel], e.cantidad)]));
  }

  protected marcarEspacio(nivel: number, indice: number, gastado: boolean): void {
    this.casillas[nivel][indice] = gastado;
    this.guardarCasillas();
  }

  private guardarCasillas(): void {
    try {
      localStorage.setItem(this.claveCasillas, JSON.stringify(this.casillas));
    } catch {
      // Sin almacenamiento disponible las casillas siguen marcadas hasta cambiar de ficha.
    }
  }

  /** Descanso largo: todos los espacios de conjuro. Corto: solo la magia de pacto (Warlock). */
  protected descansar(tipo: 'corto' | 'largo'): void {
    if (tipo === 'corto' && this.ficha.clase?.name !== 'Warlock') return;
    this.casillas = Object.fromEntries(Object.entries(this.casillas).map(([nivel, c]) => [nivel, c.map(() => false)]));
    this.guardarCasillas();
    this.cdr.markForCheck();
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
    let acciones: GrupoAccion[] = [];
    try {
      [spells, objetos, acciones] = await Promise.all([
        this.data.getHechizos(),
        this.data.getObjetos(),
        this.accionesService.construir(this.ficha, this.personaje),
      ]);
    } catch (error) {
      console.error('Error cargando hechizos, objetos y acciones de la ficha:', error);
    }
    // Si la ficha cambió mientras se cargaba, esta respuesta ya no vale.
    if (carga !== this.carga) return;

    this.acciones = acciones;

    // Hechizos de la clase (sin etiqueta) y de dotes (con el origen como etiqueta), todos juntos.
    this.niveles = new Map();
    const hechizo = (nombre: string, origen?: string): InfoItem => {
      const s = spells.find((x) => x.name === nombre);
      const base = s ? hechizoToInfoItem(s, this.entryProcessor.getSchoolName(s.school)) : sinDatos(nombre);
      const item: InfoItem = { ...base, id: `${base.id}|${origen ?? 'clase'}`, badges: origen ? [origen] : undefined };
      this.niveles.set(item.id, {
        nivel: s ? s.level : null,
        mejorable: !!s && s.level > 0 && ((s['entriesHigherLevel'] as unknown[] | undefined)?.length ?? 0) > 0,
      });
      return item;
    };
    this.hechizosPorNivel = agruparConEspacios(
      [
        ...this.personaje.hechizos.map((n) => hechizo(n)),
        ...this.ficha.hechizosDotes.map((h) => hechizo(h.nombre, h.origen)),
      ],
      (i) => this.niveles.get(i.id)!,
      (i) => i.name,
      this.espacios,
    ).map((g) => ({
      nivel: g.nivel,
      titulo: g.titulo,
      espacios: g.espacios,
      // La copia en un nivel superior lleva otra id (cada tarjeta se despliega por separado).
      items: g.items.map((x) => (x.mejora ? { ...x.item, id: `${x.item.id}|nivel${g.nivel}`, mejora: true } : x.item)),
    }));

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
      { id: 'acciones', etiqueta: 'Acciones' },
      ...(lanza ? [{ id: 'hechizos' as const, etiqueta: 'Hechizos' }] : []),
      { id: 'rasgos', etiqueta: 'Rasgos' },
      { id: 'equipo', etiqueta: 'Equipo' },
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
