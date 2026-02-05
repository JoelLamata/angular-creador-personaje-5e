import { Component, OnInit } from '@angular/core';
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
  public constructor(private readonly router: Router, private readonly jsonReader: JsonReader) {}

  ngOnInit(): void {
    this.jsonReader.getData(this.index).subscribe(resp => {
      this.classNames = Object.keys(resp);
      this.classNames = this.classNames.filter((word) => word !== "sidekick" && word !== "mystic")
    });
  }

  goTo(card: string) {
    this.router.navigate(['/clases', card])
  }
}
