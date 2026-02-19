import { Component, OnInit } from '@angular/core';
import { PRIMENG_IMPORTS } from '../primeng.imports';
import { ActivatedRoute, Router } from '@angular/router';

import { JsonReader } from '../json-reader';

@Component({
  selector: 'app-personaje',
  imports: [PRIMENG_IMPORTS],
  templateUrl: './personaje.html',
  styleUrl: './personaje.css',
})
export class Personaje implements OnInit {
  characterName: string = "rym";
  character: any;
  loading = true;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly jsonReader: JsonReader
  ) {}

  async ngOnInit() {
    try {
      const result = await this.jsonReader.getData('characters/' + this.characterName + '.json');
      //console.log(result)
      this.character = result.data;
    } catch {

    } finally {
      this.loading = false;
      console.log("loaded")
    }
  }
}
