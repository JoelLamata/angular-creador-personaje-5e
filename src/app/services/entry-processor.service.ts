import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { classTableCell, tagDisplay } from '../utils/dnd-text';

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
      return `<span class="tag tag-${tag}">${tagDisplay(tag, value)}</span>`;
    });
  }

  processEntry(entry: any): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.entryToString(entry));
  }

  /** Renderiza una lista de entradas completa (párrafos, listas, tablas...). */
  processEntries(entries: any[] | undefined): SafeHtml {
    const html = (entries ?? []).map((e) => this.entryToString(e)).join('');
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private entryToString(entry: any): string {
    if (typeof entry === 'string') {
      return '<p>' + this.parseAndHighlight(entry) + '</p>';
    }
    if (typeof entry === 'number') {
      return `<p>${entry}</p>`;
    }
    if (!entry || typeof entry !== 'object') {
      return '';
    }
    if (entry.type === 'list') {
      const items = ((entry.items as any[]) ?? [])
        .map((item) => `<li>${this.entryToString(item)}</li>`)
        .join('');
      return `<ul>${items}</ul>`;
    }
    if (entry.type === 'item') {
      const body = entry.entry
        ? this.parseAndHighlight(entry.entry)
        : ((entry.entries as any[]) ?? []).map((e) => this.entryToString(e)).join('');
      return `<p><strong>${entry.name ?? ''}</strong> ${body}</p>`;
    }
    if (entry.type === 'table') {
      return this.tableToString(entry);
    }
    if (entry.type === 'refSubclassFeature' || entry.type === 'refClassFeature') {
      return '';
    }
    if (entry.name) {
      const children = ((entry.entries as any[]) ?? []).map((e) => this.entryToString(e)).join('');
      return `<strong>${entry.name}</strong>${children}`;
    }
    if (entry.entries) {
      return (entry.entries as any[]).map((e) => this.entryToString(e)).join('');
    }
    if (entry.entry) {
      return this.entryToString(entry.entry);
    }
    return '';
  }

  private tableToString(entry: any): string {
    const caption = entry.caption ? `<caption>${this.parseAndHighlight(entry.caption)}</caption>` : '';
    const head = entry.colLabels?.length
      ? `<thead><tr>${(entry.colLabels as any[])
          .map((c) => `<th>${this.parseAndHighlight(String(c))}</th>`)
          .join('')}</tr></thead>`
      : '';
    const body = ((entry.rows as any[][]) ?? [])
      .map((row) => `<tr>${row.map((cell) => `<td>${this.cellToString(cell)}</td>`).join('')}</tr>`)
      .join('');
    return `<table class="entries-table">${caption}${head}<tbody>${body}</tbody></table>`;
  }

  private cellToString(cell: any): string {
    if (typeof cell === 'string' || typeof cell === 'number') {
      return this.parseAndHighlight(String(cell));
    }
    if (cell?.roll) {
      const { min, max, exact } = cell.roll;
      return exact !== undefined ? String(exact) : min === max ? String(min) : `${min}–${max}`;
    }
    if (cell?.entry) return this.entryToString(cell.entry);
    return classTableCell(cell);
  }
}
