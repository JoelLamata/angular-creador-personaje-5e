import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CreadorService } from '../../services/creador.service';
import { DndDataService } from '../../services/dnd-data.service';
import { Ficha, FichaService } from '../../services/ficha.service';
import { SpellData } from '../../models/dnd-data';
import { InfoListComponent } from '../../components/info-list/info-list.component';
import { InfoItem } from '../../components/info-card/info-card.component';
import { EntryProcessorService } from '../../services/entry-processor.service';
import { hechizoToInfoItem } from '../../utils/info-items';

/** Paso 7: equipo adicional y hechizos. */
@Component({
  selector: 'app-paso-equipo',
  imports: [FormsModule, RouterLink, ButtonModule, InfoListComponent],
  templateUrl: './paso-equipo.html',
  styleUrls: ['../crear-shared.scss'],
})
export class PasoEquipo implements OnInit {
  ficha: Ficha | null = null;
  loading = true;
  hechizos: string[] = [];
  extras: string[] = [];
  nuevoObjeto = '';
  /** Hechizos de la clase para el nivel actual, en el formato de la lista de selección. */
  hechizosItems: InfoItem[] = [];
  /** Aviso cuando se intenta elegir más hechizos de los permitidos. */
  aviso = '';
  nombresObjetos: string[] = [];
  disponibles: SpellData[] = [];

  private readonly creador = inject(CreadorService);
  private readonly data = inject(DndDataService);
  private readonly fichas = inject(FichaService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly entryProcessor = inject(EntryProcessorService);

  async ngOnInit(): Promise<void> {
    const b = this.creador.borrador;
    this.hechizos = [...b.hechizos];
    this.extras = [...b.equipoExtra];
    try {
      this.ficha = await this.fichas.construir(b);
      const objetos = await this.data.getObjetos();
      this.nombresObjetos = [...new Set(objetos.map((o) => o.name))];
      const clase = this.ficha.clase;
      if (clase && this.ficha.lanzamiento) {
        const max = this.ficha.lanzamiento.nivelMaximo;
        this.disponibles = (await this.data.getHechizosDeClase(clase.name)).filter((s) => s.level <= max);
        this.hechizosItems = this.disponibles.map((s) => this.aItem(s));
      }
    } catch (error) {
      console.error('Error preparando el equipo:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  private aItem(s: SpellData): InfoItem {
    return hechizoToInfoItem(s, this.entryProcessor.getSchoolName(s.school));
  }

  protected get idsElegidos(): string[] {
    return this.hechizosItems.filter((i) => this.hechizos.includes(i.name)).map((i) => i.id);
  }

  /** Hechizos sin elegir cuyo cupo (trucos o hechizos) ya está completo: no se pueden marcar. */
  protected get idsBloqueados(): string[] {
    const l = this.ficha?.lanzamiento;
    const trucosLlenos = this.elegidos(true) >= (l?.trucos ?? 0);
    const hechizosLlenos = this.elegidos(false) >= (l?.preparados ?? 0);
    if (!trucosLlenos && !hechizosLlenos) return [];
    return this.disponibles
      .filter((s) => !this.hechizos.includes(s.name) && (s.level === 0 ? trucosLlenos : hechizosLlenos))
      .map((s) => `${s.name}|${s.source}`);
  }

  protected get excedeTrucos(): boolean {
    return this.elegidos(true) > (this.ficha?.lanzamiento?.trucos ?? 0);
  }

  protected get excedeHechizos(): boolean {
    return this.elegidos(false) > (this.ficha?.lanzamiento?.preparados ?? 0);
  }

  protected elegidos(nivel0: boolean): number {
    const niveles = new Map(this.disponibles.map((s) => [s.name, s.level]));
    return this.hechizos.filter((n) => (niveles.get(n) === 0) === nivel0).length;
  }

  protected alternar(nombre: string): void {
    this.hechizos = this.hechizos.includes(nombre)
      ? this.hechizos.filter((h) => h !== nombre)
      : [...this.hechizos, nombre];
    this.aviso = '';
    this.guardar();
  }

  /** Marca o desmarca un hechizo desde la lista; no deja pasar del máximo de trucos ni de hechizos. */
  protected elegirHechizo(item: InfoItem): void {
    if (!this.hechizos.includes(item.name)) {
      const truco = this.disponibles.find((s) => s.name === item.name)?.level === 0;
      const maximo = (truco ? this.ficha?.lanzamiento?.trucos : this.ficha?.lanzamiento?.preparados) ?? 0;
      if (this.elegidos(truco) >= maximo) {
        this.aviso = `Ya has elegido ${maximo} ${truco ? 'trucos' : 'hechizos'}. Quita alguno antes de elegir otro.`;
        return;
      }
    }
    this.alternar(item.name);
  }

  protected anadirObjeto(): void {
    const nombre = this.nuevoObjeto.trim();
    if (!nombre) return;
    this.extras = [...this.extras, nombre];
    this.nuevoObjeto = '';
    this.guardar();
  }

  protected quitarObjeto(i: number): void {
    this.extras = this.extras.filter((_, idx) => idx !== i);
    this.guardar();
  }

  private guardar(): void {
    this.creador.actualizar({ hechizos: this.hechizos, equipoExtra: this.extras });
  }

  protected continuar(): void {
    this.guardar();
    this.router.navigate(['/crear/resumen']);
  }
}
