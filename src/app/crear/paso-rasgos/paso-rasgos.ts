import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SafeHtml } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { InfoListComponent } from '../../components/info-list/info-list.component';
import { InfoItem } from '../../components/info-card/info-card.component';
import { CreadorService } from '../../services/creador.service';
import { DndDataService } from '../../services/dnd-data.service';
import { EntryProcessorService } from '../../services/entry-processor.service';
import { Ficha, FichaService } from '../../services/ficha.service';
import { DndEntry } from '../../models/dnd-data';
import {
  AlternativaMejora,
  EleccionDef,
  alternativasMejora,
  doteCompleta,
  eleccionCompleta,
  filtrarEleccionesVigentes,
} from '../../utils/elecciones';
import { ABILITY_NAMES, AbilityKey, SKILLS, titleCase } from '../../utils/dnd-text';
import { dotesToInfoItems, nivelRequerido, rasgoOpcionalToInfoItem } from '../../utils/info-items';
import { ContextoRequisitos, cumpleRequisitos, nombresSeleccionables, resolverDote } from '../../utils/dotes';

interface PanelEleccion {
  def: EleccionDef;
  /** Listas largas (dotes, invocaciones, armas...), ya convertidas para la lista genérica. */
  items: InfoItem[];
  /** Habilidades o idiomas que se pueden elegir (chips). */
  posibles: string[];
  abierto: boolean;
  aviso: string;
  /** Texto de cada opción (`opcion`), preparado una sola vez para no regenerar el HTML. */
  htmlOpciones: Record<string, SafeHtml>;
}

/** Paso 6: elecciones que piden los rasgos de clase y subclase (Expertise, dotes, invocaciones...). */
@Component({
  selector: 'app-paso-rasgos',
  imports: [FormsModule, NgTemplateOutlet, RouterLink, ButtonModule, InfoListComponent],
  templateUrl: './paso-rasgos.html',
  styleUrls: ['../crear-shared.scss', './paso-rasgos.scss'],
})
export class PasoRasgos implements OnInit {
  ficha: Ficha | null = null;
  paneles: PanelEleccion[] = [];
  respuestas: Record<string, string[]> = {};
  loading = true;

  protected readonly nombresCaracteristicas = ABILITY_NAMES;

  private dotes: DndEntry[] = [];
  private idiomas: string[] = [];
  private descripcionesMaestria: Record<string, any[]> = {};
  private readonly abiertos = new Set<string>();

  private readonly creador = inject(CreadorService);
  private readonly data = inject(DndDataService);
  private readonly fichas = inject(FichaService);
  private readonly entryProcessor = inject(EntryProcessorService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    try {
      [this.dotes, this.idiomas, this.descripcionesMaestria] = await Promise.all([
        this.data.getDotes(),
        this.data.getIdiomas().then((l) => l.map((x) => x.name)),
        this.data.getDescripcionesMaestria(),
      ]);
      await this.refrescar();
    } catch (error) {
      console.error('Error preparando los rasgos:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  /** Recalcula la ficha con las respuestas actuales y reconstruye los paneles. */
  private async refrescar(): Promise<void> {
    const borrador = this.creador.borrador;
    this.ficha = await this.fichas.construir(borrador);
    this.respuestas = filtrarEleccionesVigentes(borrador.elecciones ?? {}, this.ficha.definiciones);
    this.paneles = await Promise.all(this.ficha.definiciones.map((d) => this.construirPanel(d)));
    this.cdr.detectChanges();
    this.cdr.markForCheck();
  }

  private async construirPanel(def: EleccionDef): Promise<PanelEleccion> {
    const ficha = this.ficha!;
    const propios = this.respuestas[def.clave] ?? [];
    const panel: PanelEleccion = {
      def,
      items: [],
      posibles: [],
      abierto: this.abiertos.has(def.clave),
      aviso: '',
      htmlOpciones: Object.fromEntries(
        (def.opciones ?? []).map((o) => [o.valor, this.entryProcessor.processEntries(o.descripcion)]),
      ),
    };

    switch (def.tipo) {
      case 'experiencia': {
        const deOtras = new Set(this.valoresDeOtras(def, 'experiencia'));
        const permitidas = def.de ?? null;
        panel.posibles = ficha.habilidades
          .filter((h) => h.competente)
          .map((h) => h.nombre.toLowerCase())
          .filter((h) => (!permitidas || permitidas.includes(h)) && !deOtras.has(h));
        break;
      }
      case 'competencias': {
        const yaCompetentes = new Set(
          ficha.habilidades.filter((h) => h.competente).map((h) => h.nombre.toLowerCase()),
        );
        panel.posibles = (def.de ?? SKILLS).filter((h) => propios.includes(h) || !yaCompetentes.has(h));
        break;
      }
      case 'idiomas': {
        const conocidos = new Set(ficha.idiomas);
        panel.posibles = this.idiomas.filter((i) => propios.includes(i) || !conocidos.has(i));
        break;
      }
      case 'herramientas': {
        const conocidas = new Set(ficha.herramientas.map((h) => h.toLowerCase()));
        const herramientas = await this.data.getHerramientas();
        const base =
          def.fuenteHerramientas === 'instrumentos'
            ? herramientas.instrumentos
            : def.fuenteHerramientas === 'artesano'
              ? herramientas.artesano
              : def.fuenteHerramientas === 'cualquiera'
                ? herramientas.todas
                : (def.de ?? []).map((h) => h.toLowerCase());
        panel.posibles = base.filter((h) => propios.includes(h) || !conocidas.has(h));
        break;
      }
      case 'habilidadesHerramientas': {
        const conocidas = new Set(ficha.herramientas.map((h) => h.toLowerCase()));
        const yaCompetentes = new Set(
          ficha.habilidades.filter((h) => h.competente).map((h) => h.nombre.toLowerCase()),
        );
        const herramientas = await this.data.getHerramientas();
        panel.posibles = [...SKILLS, ...herramientas.todas].filter(
          (v) => propios.includes(v) || !(yaCompetentes.has(v) || conocidas.has(v)),
        );
        break;
      }
      case 'hechizos': {
        const filtro = def.hechizo!;
        const [spells, listas] = await Promise.all([
          this.data.getHechizos(),
          this.data.getListasHechizosPorClase(),
        ]);
        const deClase = filtro.clases?.length
          ? new Set(filtro.clases.flatMap((c) => listas[c] ?? []))
          : null;
        panel.items = spells
          .filter(
            (s) =>
              s.level === filtro.nivel &&
              (!deClase || deClase.has(s.name)) &&
              (!filtro.escuelas?.length || filtro.escuelas.includes(s.school)) &&
              (!filtro.ritual || s['meta']?.ritual),
          )
          .map((s) => ({
            id: `${s.name}|${s.source}`,
            name: s.name,
            source: s.source,
            summary: `${s.level === 0 ? 'Cantrip' : 'Level ' + s.level} · ${this.entryProcessor.getSchoolName(s.school)}`,
            entries: s.entries ?? [],
          }));
        break;
      }
      case 'dote': {
        const tomadas = new Set(ficha.dotes);
        const contexto: ContextoRequisitos = {
          nivel: this.creador.borrador.nivel,
          puntuaciones: ficha.puntuaciones,
          lanzaConjuros: !!ficha.lanzamiento,
          armaduras: ficha.armaduras,
          rasgos: [...ficha.rasgosClase, ...ficha.rasgosSubclase].map((r) => r.name),
        };
        // Una dote no se toma dos veces salvo que sea repetible; cada variante cuenta como una dote.
        panel.items = this.dotes
          .filter((d) => (def.categorias ?? []).includes(d['category']) && cumpleRequisitos(d, contexto))
          .flatMap((d) =>
            dotesToInfoItems(d).filter(
              (i) =>
                propios[0] === i.name ||
                (d['repeatable'] && nombresSeleccionables(d).length === 1) ||
                !tomadas.has(i.name),
            ),
          );
        break;
      }
      case 'rasgoOpcional': {
        const nivel = this.creador.borrador.nivel;
        const rasgos = await this.data.getRasgosOpcionales(def.tiposRasgo ?? []);
        panel.items = rasgos.filter((r) => nivelRequerido(r['prerequisite']) <= nivel).map(rasgoOpcionalToInfoItem);
        break;
      }
      case 'maestria': {
        const armas = await this.data.getArmasConMaestria(def.filtroArma);
        panel.items = armas.map((a) => ({
          id: a.name,
          name: a.name,
          source: a.source,
          summary: `Mastery: ${(a['mastery'] as string[]).map((m) => m.split('|')[0]).join(', ')}`,
          entries: (a['mastery'] as string[]).flatMap((m) => this.descripcionesMaestria[m.split('|')[0]] ?? []),
        }));
        break;
      }
    }
    return panel;
  }

  private valoresDeOtras(def: EleccionDef, tipo: EleccionDef['tipo']): string[] {
    return (this.ficha?.definiciones ?? [])
      .filter((d) => d.tipo === tipo && d.clave !== def.clave)
      .flatMap((d) => this.respuestas[d.clave] ?? []);
  }

  // ------------------------------------------------------------ Estado

  protected valores(p: PanelEleccion): string[] {
    return this.respuestas[p.def.clave] ?? [];
  }

  protected completa(p: PanelEleccion): boolean {
    const v = this.valores(p);
    if (p.def.tipo === 'dote') {
      return doteCompleta(resolverDote(this.dotes, v[0] ?? '')?.feat, v);
    }
    return eleccionCompleta(p.def, v);
  }

  protected get nivel(): number {
    return this.creador.borrador.nivel;
  }

  protected get pendientes(): number {
    return this.paneles.filter((p) => !this.completa(p)).length;
  }

  protected titulo(valor: string): string {
    return titleCase(valor);
  }

  protected esChips(p: PanelEleccion): boolean {
    return ['experiencia', 'competencias', 'idiomas', 'herramientas', 'habilidadesHerramientas'].includes(
      p.def.tipo,
    );
  }

  protected idDote(p: PanelEleccion): string | null {
    return p.items.find((i) => i.name === this.valores(p)[0])?.id ?? null;
  }

  protected abrir(p: PanelEleccion, abierto: boolean): void {
    if (abierto) this.abiertos.add(p.def.clave);
    else this.abiertos.delete(p.def.clave);
    p.abierto = abierto;
  }

  private async guardar(clave: string, valores: string[]): Promise<void> {
    const respuestas = { ...this.respuestas, [clave]: valores };
    if (valores.length === 0) delete respuestas[clave];
    this.creador.actualizar({ elecciones: respuestas });
    await this.refrescar();
  }

  // ----------------------------------------------- Elecciones con chips

  protected alternar(p: PanelEleccion, valor: string): void {
    const actuales = this.valores(p);
    if (actuales.includes(valor)) {
      this.guardar(p.def.clave, actuales.filter((v) => v !== valor));
    } else if (p.def.cantidad === 1) {
      this.guardar(p.def.clave, [valor]);
    } else if (actuales.length < p.def.cantidad) {
      this.guardar(p.def.clave, [...actuales, valor]);
    }
  }

  protected opcionElegida(p: PanelEleccion) {
    const v = this.valores(p);
    return (p.def.opciones ?? []).filter((o) => v.includes(o.valor));
  }

  // --------------------------------------------- Listas (selección múltiple)

  protected elegirDeLista(p: PanelEleccion, item: InfoItem): void {
    const actuales = this.valores(p);
    if (actuales.includes(item.name)) {
      p.aviso = '';
      this.guardar(p.def.clave, actuales.filter((v) => v !== item.name));
    } else if (actuales.length >= p.def.cantidad) {
      p.aviso = `Ya has elegido ${p.def.cantidad}. Quita alguno antes de elegir otro.`;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    } else {
      p.aviso = '';
      this.guardar(p.def.clave, [...actuales, item.name]);
    }
  }

  protected idsElegidos(p: PanelEleccion): string[] {
    const v = this.valores(p);
    return p.items.filter((i) => v.includes(i.name)).map((i) => i.id);
  }

  // ------------------------------------------------------------ Dotes

  protected elegirDote(p: PanelEleccion, item: InfoItem): void {
    const actual = this.valores(p)[0];
    if (actual === item.name) {
      this.guardar(p.def.clave, []);
      return;
    }
    const alternativas = alternativasMejora(item.data);
    // Se parte de la primera forma de repartir la mejora; el jugador puede cambiarla.
    this.guardar(p.def.clave, alternativas.length >= 1 ? [item.name, '0'] : [item.name]);
    this.abrir(p, false);
  }

  protected dote(p: PanelEleccion): DndEntry | undefined {
    return resolverDote(this.dotes, this.valores(p)[0] ?? '')?.feat;
  }

  protected alternativas(p: PanelEleccion): AlternativaMejora[] {
    return alternativasMejora(this.dote(p));
  }

  protected alternativaElegida(p: PanelEleccion): number | null {
    const v = this.valores(p);
    return v[1] === undefined ? null : Number(v[1]);
  }

  protected textoAlternativa(alt: AlternativaMejora): string {
    const fijas = Object.entries(alt.fijo).map(([k, n]) => `+${n} ${this.nombresCaracteristicas[k as AbilityKey]}`);
    if (alt.elegir) {
      const { cantidad, incremento, de } = alt.elegir;
      const sobre = de.length === 6 ? 'a tu elección' : de.map((k) => this.nombresCaracteristicas[k]).join(' / ');
      fijas.push(cantidad === 1 ? `+${incremento} a una característica (${sobre})` : `+${incremento} a ${cantidad} características (${sobre})`);
    }
    return fijas.join(' y ');
  }

  protected elegirAlternativa(p: PanelEleccion, indice: number): void {
    this.guardar(p.def.clave, [this.valores(p)[0], String(indice)]);
  }

  /** Características que se pueden escoger en la posición `i` (sin repetir las ya elegidas). */
  protected caracteristicasPosibles(p: PanelEleccion, i: number): AbilityKey[] {
    const alt = this.alternativas(p)[this.alternativaElegida(p) ?? 0];
    const elegidas = this.valores(p).slice(2);
    return (alt?.elegir?.de ?? []).filter((k) => k === elegidas[i] || !elegidas.includes(k));
  }

  protected posicionesMejora(p: PanelEleccion): number[] {
    const alt = this.alternativas(p)[this.alternativaElegida(p) ?? 0];
    return Array.from({ length: alt?.elegir?.cantidad ?? 0 }, (_, i) => i);
  }

  protected elegirCaracteristica(p: PanelEleccion, i: number, clave: string): void {
    const v = this.valores(p);
    const elegidas = v.slice(2);
    elegidas[i] = clave;
    this.guardar(p.def.clave, [v[0], v[1] ?? '0', ...elegidas.filter(Boolean)]);
  }

  protected caracteristicaElegida(p: PanelEleccion, i: number): string {
    return this.valores(p).slice(2)[i] ?? '';
  }

  // ------------------------------------------------------------ Navegación

  protected continuar(): void {
    this.router.navigate(['/crear/equipo']);
  }
}
