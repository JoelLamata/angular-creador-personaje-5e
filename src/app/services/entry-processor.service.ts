import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class EntryProcessorService {
  constructor(private sanitizer: DomSanitizer) {}

  private readonly SCHOOL_NAMES: Record<string, string> = {
    A: 'abjuration',
    C: 'conjuration',
    D: 'divination',
    E: 'enchantment',
    V: 'evocation',
    I: 'illusion',
    N: 'necromancy',
    T: 'transmutation',
  };

  private readonly SCHOOL_NAMES_ES: Record<string, string> = {
    A: 'Abjuración',
    C: 'Conjuración',
    D: 'Adivinación',
    E: 'Encantamiento',
    V: 'Evocación',
    I: 'Ilusión',
    N: 'Nigromancia',
    T: 'Transmutación',
  };

  private readonly SCHOOL_ICON_BASE =
    'https://www.dndbeyond.com/content/1-1-124-0/skins/waterdeep/images/spell-schools/35';

  processSpellLevel(level: number): string {
    if (level == 0) return 'Cantrip';
    return 'Level ' + level.toString();
  }

  getSchoolName(school: string): string {
    return this.SCHOOL_NAMES_ES[school.toUpperCase()] ?? school;
  }

  getSchoolIconUrl(school: string): string {
    const name = this.SCHOOL_NAMES[school.toUpperCase()];
    return name ? `${this.SCHOOL_ICON_BASE}/${name}.png` : '';
  }

  preloadSchoolIcons(): void {
    Object.values(this.SCHOOL_NAMES).forEach((name) => {
      new Image().src = `${this.SCHOOL_ICON_BASE}/${name}.png`;
    });
  }

  parseAndHighlight(text: string): string {
    if (!text || typeof text !== 'string') return '';

    let result = text.replace(/\{@(scaledice|scaledamage)\s+([^}]+)\}/g, (_match, _tag, content) => {
      const last = content.split('|').pop()!.trim();
      return `<span class="tag tag-dice">${last}</span>`;
    });

    return result.replace(/\{@(\w+) ([^}]+)\}/g, (_match, tag, value) => {
      return `<span class="tag tag-${tag}">${value}</span>`;
    });
  }

  processEntry(entry: any): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.entryToString(entry));
  }

  private entryToString(entry: any): string {
    if (typeof entry === 'string') {
      return '<p>' + this.parseAndHighlight(entry) + '</p>';
    }
    if (entry?.type === 'list') {
      const items = (entry.items as any[]).map((item) => `<li>${this.entryToString(item)}</li>`).join('');
      return `<ul>${items}</ul>`;
    }
    if (entry?.name) {
      const children = (entry.entries as any[] ?? []).map((e) => this.entryToString(e)).join('');
      return `<strong>${entry.name}</strong>${children}`;
    }
    if (entry?.type === 'entries' && entry.entries) {
      return (entry.entries as any[]).map((e) => this.entryToString(e)).join('');
    }
    return '';
  }
}
