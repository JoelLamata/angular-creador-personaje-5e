import { Injectable } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class EntryProcessorService {
  constructor(private sanitizer: DomSanitizer) {}

  processEntry(entry: string): SafeHtml {
    const processed = entry.replace(/\{@([^ ]+) ([^}]+)\}/g, '<strong>$2</strong>');
    return this.sanitizer.bypassSecurityTrustHtml(processed);
  }

  processSpellLevel(level: number): string {
    if (level == 0) {
      return 'Cantrip'
    }
    return 'Level ' + level.toString()
  }
}
