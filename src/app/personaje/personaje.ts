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
  spells: Map<string, any> = new Map();

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
  characterSpells: any;

  constructor(
    private readonly jsonReader: JsonReader
  ) {}

  async ngOnInit() {
    try {
      const result = await this.jsonReader.getData('characters/' + this.characterName + '.json');
      this.character = result.data;
      this.loadStats()
      const spellsResult = await this.jsonReader.getData('spells/spells-phb.json')  // TODO all spells
      for (const spell of spellsResult.spell) {
        this.spells.set(spell.name, spell);
      }
      this.loadSpells();
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
    return Math.trunc((stat - 10) / 2)
  }

  loadSpells() {
    this.characterSpells = [];
    for (const s of this.character.spells.feat) {
      const spell = this.spells.get(s.definition.name);
      if (spell) {
        this.characterSpells.push(spell);
      }
    }
    for (const s of this.character.classSpells[0].spells) { // CUIDAO CON EL [0]
      const spell = this.spells.get(s.definition.name);
      if (spell) {
        this.characterSpells.push(spell);
      }
    }
  }
}
