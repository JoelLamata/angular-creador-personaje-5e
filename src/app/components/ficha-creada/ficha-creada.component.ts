import { Component, Input, OnChanges } from '@angular/core';
import { InfoCardComponent, InfoItem } from '../info-card/info-card.component';
import { Ficha } from '../../services/ficha.service';
import { PersonajeCreado } from '../../models/personaje.model';
import { ABILITY_KEYS, ABILITY_SHORT, formatModifier, formatSizes } from '../../utils/dnd-text';

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
