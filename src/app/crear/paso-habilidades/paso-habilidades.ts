import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CreadorService } from '../../services/creador.service';
import { DndDataService } from '../../services/dnd-data.service';
import { MetodoPuntuaciones, Puntuaciones, puntuacionesVacias } from '../../models/personaje.model';
import { ABILITY_KEYS, ABILITY_NAMES, AbilityKey, abilityModifier, formatModifier } from '../../utils/dnd-text';
import { ARRAY_ESTANDAR, COSTE_COMPRA, PUNTOS_COMPRA, costeCompra } from '../../utils/reglas';

/** Paso 6: puntuaciones de característica e idiomas. */
@Component({
  selector: 'app-paso-habilidades',
  imports: [FormsModule, RouterLink, ButtonModule],
  templateUrl: './paso-habilidades.html',
  styleUrls: ['../crear-shared.scss', './paso-habilidades.scss'],
})
export class PasoHabilidades implements OnInit {
  protected readonly claves = ABILITY_KEYS;
  protected readonly nombres = ABILITY_NAMES;
  protected readonly arrayEstandar = ARRAY_ESTANDAR;
  protected readonly puntosCompra = PUNTOS_COMPRA;
  protected readonly mod = abilityModifier;
  protected readonly fmt = formatModifier;

  metodo: MetodoPuntuaciones = 'estandar';
  /** Puntuaciones base; `null` = sin asignar (solo método estándar). */
  base: Record<AbilityKey, number | null> = puntuacionesVacias(8);
  bonos: Puntuaciones = puntuacionesVacias(0);
  idiomas: string[] = [];
  idiomasPosibles: { name: string; tipo: string }[] = [];

  private readonly creador = inject(CreadorService);
  private readonly data = inject(DndDataService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  async ngOnInit(): Promise<void> {
    const b = this.creador.borrador;
    this.metodo = b.metodoPuntuaciones;
    this.base = { ...b.puntuacionesBase };
    this.bonos = { ...b.bonosTrasfondo };
    this.idiomas = [...b.idiomas];
    if (this.metodo === 'estandar' && !this.estandarValido()) this.reiniciarEstandar();

    try {
      const idiomas = await this.data.getIdiomas();
      this.idiomasPosibles = idiomas.map((l) => ({ name: l.name, tipo: l['type'] ?? '' }));
      if (!this.idiomas.includes('Common')) this.idiomas = ['Common', ...this.idiomas];
    } catch (error) {
      console.error('Error cargando idiomas:', error);
    }
    this.cdr.detectChanges();
    this.cdr.markForCheck();
  }

  private estandarValido(): boolean {
    const valores = ABILITY_KEYS.map((k) => this.base[k]).filter((v): v is number => v !== null);
    return valores.every((v) => ARRAY_ESTANDAR.includes(v)) && new Set(valores).size === valores.length;
  }

  private reiniciarEstandar(): void {
    this.base = Object.fromEntries(ABILITY_KEYS.map((k) => [k, null])) as Record<AbilityKey, number | null>;
  }

  protected cambiarMetodo(m: MetodoPuntuaciones): void {
    this.metodo = m;
    if (m === 'estandar') this.reiniciarEstandar();
    else this.base = puntuacionesVacias(m === 'compra' ? 8 : 10);
    this.guardar();
  }

  // ---- estándar
  protected disponiblesEstandar(k: AbilityKey): number[] {
    return ARRAY_ESTANDAR.filter((v) => v === this.base[k] || !ABILITY_KEYS.some((o) => this.base[o] === v));
  }

  protected asignarEstandar(k: AbilityKey, valor: number | null): void {
    this.base = { ...this.base, [k]: valor };
    this.guardar();
  }

  // ---- compra
  protected get coste(): number {
    return costeCompra(this.base as Puntuaciones);
  }

  protected puedeSubir(k: AbilityKey): boolean {
    const v = this.base[k] ?? 8;
    return v < 15 && this.coste - (COSTE_COMPRA[v] ?? 0) + (COSTE_COMPRA[v + 1] ?? 99) <= PUNTOS_COMPRA;
  }

  protected cambiarCompra(k: AbilityKey, delta: number): void {
    const v = (this.base[k] ?? 8) + delta;
    if (v < 8 || v > 15 || (delta > 0 && !this.puedeSubir(k))) return;
    this.base = { ...this.base, [k]: v };
    this.guardar();
  }

  // ---- manual
  protected cambiarManual(k: AbilityKey, valor: number | null): void {
    // Se guarda lo que escribe el jugador tal cual: validar a cada pulsación impediría escribir "12".
    this.base = { ...this.base, [k]: valor };
    this.guardar();
  }

  /** En el modo manual, entero entre 3 y 20. Un campo vacío no es válido. */
  protected valorValido(k: AbilityKey): boolean {
    const v = this.base[k];
    return v !== null && Number.isInteger(v) && v >= 3 && v <= 20;
  }

  protected get hayValorInvalido(): boolean {
    return this.metodo === 'manual' && ABILITY_KEYS.some((k) => !this.valorValido(k));
  }

  protected tirar(): void {
    const tirada = () => {
      const dados = Array.from({ length: 4 }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => a - b);
      return dados[1] + dados[2] + dados[3];
    };
    this.base = Object.fromEntries(ABILITY_KEYS.map((k) => [k, tirada()])) as Record<AbilityKey, number | null>;
    this.guardar();
  }

  // ---- común
  protected total(k: AbilityKey): number | null {
    const v = this.base[k];
    if (v === null || (this.metodo === 'manual' && !this.valorValido(k))) return null;
    return Math.min(20, v + this.bonos[k]);
  }

  protected alternarIdioma(nombre: string): void {
    if (nombre === 'Common') return;
    this.idiomas = this.idiomas.includes(nombre)
      ? this.idiomas.filter((i) => i !== nombre)
      : [...this.idiomas, nombre];
    this.guardar();
  }

  protected get completo(): boolean {
    return ABILITY_KEYS.every((k) => this.base[k] !== null) && !this.hayValorInvalido;
  }

  protected guardar(): void {
    // Un valor manual fuera de rango no se guarda: se conserva el último válido.
    const previo = this.creador.borrador.puntuacionesBase;
    const base = Object.fromEntries(
      ABILITY_KEYS.map((k) => [
        k,
        this.metodo === 'manual' && !this.valorValido(k) ? previo[k] : (this.base[k] ?? 8),
      ]),
    ) as Puntuaciones;
    this.creador.actualizar({ metodoPuntuaciones: this.metodo, puntuacionesBase: base, idiomas: this.idiomas });
  }

  protected continuar(): void {
    this.guardar();
    if (this.completo) this.router.navigate(['/crear/rasgos']);
  }
}
