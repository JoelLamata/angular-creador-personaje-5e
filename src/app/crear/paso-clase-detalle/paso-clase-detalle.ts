import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DndDataService } from '../../services/dnd-data.service';
import { CreadorService } from '../../services/creador.service';
import { ClassInfo, SubclassInfo } from '../../models/dnd-data';
import { InfoCardComponent, InfoItem } from '../../components/info-card/info-card.component';
import { EleccionHabilidad, OpcionEquipo, opcionesEquipo } from '../../utils/reglas';
import { SKILLS, classTableCell, proficiencyBonus, stripTags, titleCase } from '../../utils/dnd-text';

interface TablaClase {
  cabecera: string[];
  filas: string[][];
}

/** Paso 2: detalle de la clase elegida (nivel, subclase, habilidades y equipo). */
@Component({
  selector: 'app-paso-clase-detalle',
  imports: [FormsModule, RouterLink, ButtonModule, InfoCardComponent],
  templateUrl: './paso-clase-detalle.html',
  styleUrls: ['../crear-shared.scss', './paso-clase-detalle.scss'],
})
export class PasoClaseDetalle implements OnInit, OnDestroy {
  clase: ClassInfo | null = null;
  loading = true;
  nivel = 1;
  subclaseId: string | null = null;
  habilidades: string[] = [];
  equipo: string | null = null;

  tabla: TablaClase = { cabecera: [], filas: [] };
  eleccion: EleccionHabilidad | null = null;
  opcionesEquipo: OpcionEquipo[] = [];
  textoEquipo: string[] = [];

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly data = inject(DndDataService);
  private readonly creador = inject(CreadorService);
  private readonly cdr = inject(ChangeDetectorRef);
  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe((params) => this.cargar(params.get('clase') ?? ''));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private async cargar(nombre: string): Promise<void> {
    this.loading = true;
    try {
      const clases = await this.data.getClases();
      this.clase = clases.find((c) => c.name === nombre) ?? null;
      if (this.clase) this.inicializar(this.clase);
    } catch (error) {
      console.error('Error cargando la clase:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  private inicializar(clase: ClassInfo): void {
    const b = this.creador.borrador;
    const mismaClase = b.clase?.name === clase.name && b.clase?.source === clase.source;
    this.nivel = mismaClase ? b.nivel : 1;
    this.subclaseId = mismaClase && b.subclase ? `${b.subclase.name}|${b.subclase.source}` : null;
    this.habilidades = mismaClase ? [...b.habilidadesClase] : [];
    this.equipo = mismaClase ? b.equipoClase : null;

    const skills = clase.def['startingProficiencies']?.skills?.[0];
    this.eleccion = skills?.choose
      ? { from: skills.choose.from, count: skills.choose.count ?? 1 }
      : skills?.any
        ? { from: null, count: skills.any }
        : null;

    const inicial = opcionesEquipo(clase.def['startingEquipment']);
    this.opcionesEquipo = inicial.opciones;
    this.textoEquipo = inicial.texto;
    this.tabla = this.construirTabla(clase);
  }

  protected get habilidadesPosibles(): string[] {
    return this.eleccion?.from ?? SKILLS;
  }

  /** Las habilidades se guardan en minúsculas y se muestran capitalizadas. */
  protected titulo(clave: string): string {
    return titleCase(clave);
  }

  protected get subclase(): SubclassInfo | null {
    return this.clase?.subclasses.find((s) => `${s.name}|${s.source}` === this.subclaseId) ?? null;
  }

  protected get puedeElegirSubclase(): boolean {
    return !!this.clase && this.clase.subclasses.length > 0 && this.nivel >= this.clase.subclassLevel;
  }

  protected get rasgos(): InfoItem[] {
    const clase = this.clase;
    if (!clase) return [];
    const aItem = (f: { name: string; level: number; source: string; entries?: any[] }, extra?: string): InfoItem => ({
      id: `${f.name}|${f.level}|${extra ?? ''}`,
      name: f.name,
      source: f.source,
      badges: [`Nivel ${f.level}`, ...(extra ? [extra] : [])],
      entries: f.entries ?? [],
    });
    const base = clase.features.filter((f) => f.level <= this.nivel).map((f) => aItem(f));
    const sub = (this.subclase?.features ?? [])
      .filter((f) => f.level <= this.nivel)
      .map((f) => aItem(f, this.subclase!.shortName));
    return [...base, ...sub].sort((a, b) => this.nivelDe(a) - this.nivelDe(b));
  }

  private nivelDe(item: InfoItem): number {
    return parseInt(item.badges?.[0]?.replace('Nivel ', '') ?? '0', 10);
  }

  protected competencias(clave: 'armor' | 'weapons' | 'tools'): string {
    const lista: any[] = this.clase?.def['startingProficiencies']?.[clave] ?? [];
    return lista
      .map((x) => (typeof x === 'string' ? titleCase(stripTags(x)) : x?.proficiency ? titleCase(x.proficiency) : ''))
      .filter(Boolean)
      .join(', ');
  }

  protected textoOpcion(op: OpcionEquipo): string {
    const oro = op.oro ? `${op.oro} po` : '';
    return [op.items.join(', '), oro].filter(Boolean).join(' y ');
  }

  protected get salvaciones(): string {
    return ((this.clase?.def['proficiency'] ?? []) as string[]).map((k) => k.toUpperCase()).join(', ');
  }

  protected get bonusCompetencia(): number {
    return proficiencyBonus(this.nivel);
  }

  protected cambiarNivel(valor: number): void {
    this.nivel = Math.min(20, Math.max(1, Math.floor(Number(valor)) || 1));
    if (!this.puedeElegirSubclase) this.subclaseId = null;
  }

  protected alternarHabilidad(h: string): void {
    if (this.habilidades.includes(h)) {
      this.habilidades = this.habilidades.filter((x) => x !== h);
    } else if (this.habilidades.length < (this.eleccion?.count ?? 0)) {
      this.habilidades = [...this.habilidades, h];
    }
  }

  protected get completo(): boolean {
    const habilidadesOk = this.habilidades.length === (this.eleccion?.count ?? 0);
    const equipoOk = this.opcionesEquipo.length === 0 || this.equipo !== null;
    return habilidadesOk && equipoOk;
  }

  protected confirmar(): void {
    const clase = this.clase;
    if (!clase || !this.completo) return;
    const sub = this.subclase;
    const previo = this.creador.borrador;
    const mismaClase = previo.clase?.name === clase.name && previo.clase?.source === clase.source;
    const mismaSubclase = previo.subclase?.name === sub?.name && previo.subclase?.source === sub?.source;
    this.creador.actualizar({
      // Las elecciones de rasgos dependen de la clase y la subclase: si cambian, se descartan.
      elecciones: mismaClase && mismaSubclase ? previo.elecciones : {},
      clase: { name: clase.name, source: clase.source },
      nivel: this.nivel,
      subclase: sub ? { name: sub.name, source: sub.source, shortName: sub.shortName } : null,
      habilidadesClase: this.habilidades,
      equipoClase: this.equipo,
      hechizos: [],
    });
    this.router.navigate(['/crear/especie']);
  }

  private construirTabla(clase: ClassInfo): TablaClase {
    const grupos: any[] = clase.def['classTableGroups'] ?? [];
    const cabecera = ['Nivel', 'Competencia', 'Rasgos'];
    const columnas: { grupo: any; idx: number; espacios: boolean }[] = [];
    for (const g of grupos) {
      if (g.rowsSpellProgression) {
        (g.colLabels ?? []).forEach((l: string, idx: number) => {
          cabecera.push(stripTags(l));
          columnas.push({ grupo: g, idx, espacios: true });
        });
      } else {
        (g.colLabels ?? []).forEach((l: string, idx: number) => {
          cabecera.push(stripTags(l));
          columnas.push({ grupo: g, idx, espacios: false });
        });
      }
    }
    const filas: string[][] = [];
    for (let nivel = 1; nivel <= 20; nivel++) {
      const rasgos = clase.features
        .filter((f) => f.level === nivel)
        .map((f) => f.name)
        .join(', ');
      const fila = [String(nivel), `+${proficiencyBonus(nivel)}`, rasgos || '—'];
      for (const c of columnas) {
        if (c.espacios) {
          const n = c.grupo.rowsSpellProgression?.[nivel - 1]?.[c.idx] ?? 0;
          fila.push(n > 0 ? String(n) : '—');
        } else {
          fila.push(classTableCell(c.grupo.rows?.[nivel - 1]?.[c.idx]) || '—');
        }
      }
      filas.push(fila);
    }
    return { cabecera, filas };
  }
}
