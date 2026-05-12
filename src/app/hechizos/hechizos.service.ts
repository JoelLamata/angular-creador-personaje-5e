import { Injectable } from '@angular/core';
import { Spell, SpellRaw } from './types';
import { JsonReader } from '../json-reader';
import { ALLOWED_SOURCES } from '../sourcesConfigService';
import { BehaviorSubject } from 'rxjs';
import { EntryProcessorService } from '../services/entry-processor.service';

@Injectable({
  providedIn: 'root',
})
export class HechizosService {
  private spells: Spell[] = [];
  private loaded = false;
  private loadingPromise?: Promise<Spell[]>;
  private spellsSubject = new BehaviorSubject<Spell[]>([]);
  spells$ = this.spellsSubject.asObservable();

  constructor(
    private jsonReader: JsonReader,
    private entryProcessor: EntryProcessorService,
  ) {
    this.loadSpells();
  }

  async loadSpells(): Promise<Spell[]> {
    if (this.loaded) return this.spells;
    if (this.loadingPromise) return this.loadingPromise;

    this.fetchAllSpells();

    this.loaded = true;
    return this.spells;
  }

  private async fetchAllSpells(): Promise<void> {
    try {
      const files: string[] = await this.jsonReader.getData('spells/index.json');

      const allSpells: Spell[] = [];

      for (const file of Object.keys(files)) {
        if (ALLOWED_SOURCES.includes(file)) {
          try {
            const data = await this.jsonReader.getPageData(`spells/`, file, false);

            const rawSpells: SpellRaw[] = data.spell || data;

            const transformed = rawSpells.map((raw) => this.transformSpell(raw, file));

            if (!transformed.length) continue;

            allSpells.push(...transformed);
            this.spellsSubject.next([...allSpells]);
          } catch (err) {
            console.warn('Error cargando archivo:', file);
          }
        }
      }

      this.spellsSubject.next(this.sortSpells(allSpells));
    } catch (err) {
      console.error('Error cargando hechizos:', err);
      this.spellsSubject.next([]);
    }
  }

  private formatScalingLevelDice(data: any): string {
    if (!data || !data.scaling) return '';

    const label = data.label ? ` (${data.label})` : '';

    const scalingEntries = Object.entries(data.scaling)
      .map(([level, value]) => `Nivel ${level}: ${value}`)
      .join(', ');

    return `Escalado${label}: ${scalingEntries}`;
  }

  private formatHigherLevel(raw: SpellRaw): string | undefined {
    if (raw.level === 0 && raw.scalingLevelDice) {
      return this.entryProcessor.parseAndHighlight(this.formatScalingLevelDice(raw.scalingLevelDice));
    }

    if (raw.entriesHigherLevel?.length) {
      const text =
        'A niveles superiores: ' + raw.entriesHigherLevel.map((e) => e.entries.join(' ')).join(' ');

      return this.entryProcessor.parseAndHighlight(text);
    }

    return undefined;
  }

  private transformSpell(raw: SpellRaw, file: string): Spell {
    const casting_time = this.formatCastingTime(raw.time);
    const range = this.formatRange(raw.range);
    const components = this.formatComponents(raw.components);
    const duration = this.formatDuration(raw.duration);
    const description = this.formatDescription(raw);

    const higher_level = this.formatHigherLevel(raw);
    let source_file = file;
    if (/phb/i.test(file)) {
      source_file = file.split('X')[1];
    }

    const spell: Spell = {
      name_en: raw.name,
      level: raw.level,
      school: raw.school,

      casting_time,
      range,
      components,
      duration,

      description,
      higher_level,

      source_file,

      _search: '',
    };

    spell._search = spell.name_en.toLowerCase();

    return spell;
  }

  private formatCastingTime(time: any[]): string {
    return time.map((t) => `${t.number} ${this.normalizeUnit(t.unit)}`).join(' + ');
  }

  private formatRange(range: any): string {
    const typeMap: Record<string, string> = {
      touch: 'Toque',
      self: 'Personal',
      sight: 'Vista',
      unlimited: 'Ilimitado',
    };

    if (typeMap[range.type]) return typeMap[range.type];

    const dist = range.distance;

    if (dist?.amount) {
      return `${dist.amount} ${this.normalizeUnit(dist.type)}`;
    }

    return this.normalizeUnit(dist?.type || range.type);
  }

  private formatComponents(c: any): string {
    const parts: string[] = [];

    if (c.v) parts.push('V');
    if (c.s) parts.push('S');
    if (c.m) {
      parts.push(`M (${c.m.text || 'material'})`);
    }

    return parts.join(', ');
  }

  private formatDuration(duration: any[]): string {
    return duration
      .map((d) => {
        if (d.type === 'instant') return 'Instantáneo';
        if (d.type === 'timed' && d.duration) {
          return `${d.duration.amount} ${this.normalizeUnit(d.duration.type)}`;
        }
        if (d.type === 'concentration') {
          return 'Concentración';
        }
        return d.type;
      })
      .join(', ');
  }

  private formatDescription(raw: SpellRaw): string {
    return raw.entries.map((e) => this.entryProcessor.parseAndHighlight(e)).join('<br><br>');
  }

  private normalizeUnit(unit: string): string {
    const map: Record<string, string> = {
      action: 'acción',
      bonus: 'acción adicional',
      reaction: 'reacción',
      minute: 'minuto',
      minutes: 'minutos',
      hour: 'hora',
      hours: 'horas',
      round: 'asalto',
      feet: 'pies',
    };

    return map[unit] || unit;
  }

  private sortSpells(spells: Spell[]): Spell[] {
    return spells.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.name_en.localeCompare(b.name_en);
    });
  }
}
