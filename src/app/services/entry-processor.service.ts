import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class EntryProcessorService {
  constructor(private sanitizer: DomSanitizer) {}

  processSpellLevel(level: number): string {
    if (level == 0) return 'Cantrip';
    return 'Level ' + level.toString();
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
