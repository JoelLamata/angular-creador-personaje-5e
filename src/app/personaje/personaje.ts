import { Component, OnInit } from '@angular/core';
import { PRIMENG_IMPORTS } from '../primeng.imports';
import { ActivatedRoute, Router } from '@angular/router';

import { JsonReader } from '../json-reader';

interface stats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

@Component({
  selector: 'app-personaje',
  imports: [PRIMENG_IMPORTS],
  templateUrl: './personaje.html',
  styleUrl: './personaje.css',
})
export class Personaje implements OnInit {
  loading = true;

  characterName: string = "rym";
  character: any;
  characterStats: stats = {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0
  };

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
      this.loadStats()
    } catch(error) {
      console.log(error)
    } finally {
      this.loading = false;
      console.log("loaded")
    }
  }

  loadStats() {
    this.characterStats.strength = this.character.stats[0].value;
    this.characterStats.dexterity = this.character.stats[1].value;
    this.characterStats.constitution = this.character.stats[2].value;
    this.characterStats.intelligence = this.character.stats[3].value;
    this.characterStats.wisdom = this.character.stats[4].value;
    this.characterStats.charisma = this.character.stats[5].value;

    for(let i in this.character.modifiers.feat) {
      let bonus = this.character.modifiers.feat[i];
      switch (bonus.subType) {
        case 'strength-score':
          this.characterStats.strength++;
          break;
        case 'dexterity-score':
          this.characterStats.dexterity++;
          break;
        case 'constitution-score':
          this.characterStats.constitution++;
          break;
        case 'intelligence-score':
          this.characterStats.intelligence++;
          break;
        case 'wisdom-score':
          this.characterStats.wisdom++;
          break;
        case 'charisma-score':
          this.characterStats.charisma++;
          break;
      }
    }
  }

  computeModifier(stat: number) {
    console.log(stat)
    return Math.trunc((stat - 10) / 2)
  }
}
