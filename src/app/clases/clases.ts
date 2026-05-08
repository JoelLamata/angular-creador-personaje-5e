import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { JsonReader } from '../json-reader';
import { PRIMENG_IMPORTS } from '../primeng.imports';
import { Router } from '@angular/router';

@Component({
  selector: 'app-clases',
  imports: [PRIMENG_IMPORTS],
  templateUrl: './clases.html',
  styleUrl: './clases.css',
  standalone: true,
})
export class Clases implements OnInit {
  classNames: string[] = [];
  index: string = 'class/index.json'
  private cdr = inject(ChangeDetectorRef);
  public constructor(private readonly router: Router, private readonly jsonReader: JsonReader) {}

  async ngOnInit(): Promise<void> {
    const data = await this.jsonReader.getData(this.index);
    this.classNames = Object.keys(data);
    this.classNames = this.classNames.filter((word) => word !== "sidekick" && word !== "mystic")
    this.cdr.detectChanges();
  }

  goTo(card: string) {
    this.router.navigate(['/clases', card])
  }
}
