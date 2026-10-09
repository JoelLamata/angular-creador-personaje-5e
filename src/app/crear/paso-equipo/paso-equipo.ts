import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CreadorService } from '../../services/creador.service';
import { DndDataService } from '../../services/dnd-data.service';
import { Ficha, FichaService } from '../../services/ficha.service';
import { SpellData } from '../../models/dnd-data';

interface GrupoHechizos {
  nivel: number;
  titulo: string;
  hechizos: SpellData[];
}

/** Paso 7: equipo adicional y hechizos. */
@Component({
  selector: 'app-paso-equipo',
  imports: [FormsModule, RouterLink, ButtonModule],
  templateUrl: './paso-equipo.html',
  styleUrls: ['../crear-shared.scss'],
})
export class PasoEquipo implements OnInit {
  ficha: Ficha | null = null;
  loading = true;
  hechizos: string[] = [];
  extras: string[] = [];
  nuevoObjeto = '';
  busqueda = '';
  nombresObjetos: string[] = [];
  disponibles: SpellData[] = [];

  private readonly creador = inject(CreadorService);
  private readonly data = inject(DndDataService);
  private readonly fichas = inject(FichaService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

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
      }
    } catch (error) {
      console.error('Error preparando el equipo:', error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.cdr.markForCheck();
    }
  }

  protected get grupos(): GrupoHechizos[] {
    const texto = this.busqueda.trim().toLowerCase();
    const niveles = [...new Set(this.disponibles.map((s) => s.level))].sort((a, b) => a - b);
    return niveles.map((nivel) => ({
      nivel,
      titulo: nivel === 0 ? 'Trucos' : `Nivel ${nivel}`,
      hechizos: this.disponibles.filter(
        (s) => s.level === nivel && (!texto || s.name.toLowerCase().includes(texto)),
      ),
    }));
  }

  protected elegidos(nivel0: boolean): number {
    const niveles = new Map(this.disponibles.map((s) => [s.name, s.level]));
    return this.hechizos.filter((n) => (niveles.get(n) === 0) === nivel0).length;
  }

  protected alternar(nombre: string): void {
    this.hechizos = this.hechizos.includes(nombre)
      ? this.hechizos.filter((h) => h !== nombre)
      : [...this.hechizos, nombre];
    this.guardar();
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
