import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class EntryProcessorService {
  constructor(private sanitizer: DomSanitizer) {}

  processSpellLevel(level: number): string {
    if (level == 0) {
      return 'Cantrip'
    }
    return 'Level ' + level.toString()
  }

  processEntry(entry: any): SafeHtml {
    let html = '';

    if (typeof entry === 'string') {
      html += '<p>' + this.sanitizeHtml(entry) + '</p>';
    } else if (entry.type === 'list') {
      html += '<ul>';
      for (const item of entry.items) {
        html += '<li>' + this.sanitizeHtml(this.processEntry(item)) + '</li>';
      }
      html += '</ul>';
    } else if (entry.name) {
      html += '<strong>' + entry.name + '</strong>';
      if (entry.entries) {
        for (const childEntry of entry.entries) {
          html += this.sanitizeHtml(this.processEntry(childEntry));
        }
      }
    } else if (entry.type === 'entries') {
      if (entry.entries) {
        for (const childEntry of entry.entries) {
          html += this.sanitizeHtml(this.processEntry(childEntry));
        }
      }
    }

    return this.sanitizer.bypassSecurityTrustHtml(html);
  }

  private sanitizeHtml(entry: any): string {
    if (typeof entry === 'string') {
      return entry.replace(/\{@([^ ]+) ([^}]+)\}/g, '<strong>$2</strong>');
    }
    return '';
  }
}
