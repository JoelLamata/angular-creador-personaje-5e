import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { firstValueFrom } from "rxjs";
import { Spell, SpellRaw } from "./types";

@Injectable({
  providedIn: 'root',
})
export class HechizosService {
  private spells: Spell[] = [];
  private loaded = false;
  private loadingPromise?: Promise<Spell[]>;

  constructor(private http: HttpClient) {}

  async loadSpells(): Promise<Spell[]> {
    if (this.loaded) return this.spells;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this.fetchAllSpells();
    this.spells = await this.loadingPromise;

    this.loaded = true;
    return this.spells;
  }

  private async fetchAllSpells(): Promise<Spell[]> {
    try {
      
      const files: object = await firstValueFrom(
        this.http.get<object>('/assets/spells/index.json')
      );

      const results = await Promise.allSettled(
        Object.values(files).map((file) =>
          firstValueFrom(this.http.get<SpellRaw[]>(`/assets/spells/${file}`))
        )
      );

      const spells: Spell[] = [];
      
      for (const result of Object.values(results)) {
        if (result.status === 'fulfilled') {
            for (const raw of (result.value as any).spell) {
            spells.push(this.transformSpell(raw, raw.source as any));
          }
        }
      }

      return this.sortSpells(spells);
    } catch (err) {
      console.error('Error cargando hechizos:', err);
      return [];
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
            return this.parseAndHighlight(
            this.formatScalingLevelDice(raw.scalingLevelDice)
            );
        }

        if (raw.entriesHigherLevel?.length) {
            const text =
            'A niveles superiores: ' +
            raw.entriesHigherLevel
                .map((e) => e.entries.join(' '))
                .join(' ');

            return this.parseAndHighlight(text);
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
        source_file = `PHB - ${/^xphb/i.test(file) ? 2024 : 2014}`
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

    spell._search = (spell.name_en).toLowerCase();

    return spell;
    }


  private formatCastingTime(time: any[]): string {
    return time
      .map((t) => `${t.number} ${this.normalizeUnit(t.unit)}`)
      .join(' + ');
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
    
    private parseAndHighlight(text: string): string {
        if (!text || typeof text !== "string") return '';
        let finalText = text;

        finalText = text.replace(/\{@(scaledice|scaledamage)\s+([^}]+)\}/g, (_, tag, content) => {
            const parts = content.split('|');
            const last = parts[parts.length - 1].trim();
            return `<span class="tag tag-dice">${last}</span>`;
        });
        
        finalText = text.replace(/\{@(\w+) ([^}]+)\}/g, (_, tag, value) => {
            return `<span class="tag tag-${tag}">${value}</span>`;
        });

        return finalText;
    }

  private formatDescription(raw: SpellRaw): string {
    return raw.entries
        .map((e) => this.parseAndHighlight(e))
        .join('<br><br>');
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


  async getAllSpells(): Promise<Spell[]> {
    return this.loadSpells();
  }

  async getSpellsByLevel(level: number): Promise<Spell[]> {
    const spells = await this.loadSpells();
    return spells.filter((s) => s.level === level);
  }

  async getSpellByName(name: string): Promise<Spell | undefined> {
    const spells = await this.loadSpells();
    const q = name.toLowerCase();

    return spells.find(
      (s) =>
        s.name_en.toLowerCase() === q || s.name_en.toLowerCase().includes(q)
    );
  }

  async searchSpells(query: string): Promise<Spell[]> {
    const spells = await this.loadSpells();
    const q = query.toLowerCase();

    return spells.filter((s) => s._search?.includes(q));
  }
}