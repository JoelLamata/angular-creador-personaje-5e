import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PRIMENG_IMPORTS } from '../primeng.imports';
import { ALLOWED_SOURCES } from '../sourcesConfigService';
import { JsonReader } from '../json-reader';
import { EntryProcessorService } from '../services/entry-processor.service';
import { PlayerBaseComponent } from '../components/player-base/player-base.component';
import { PlayerStatsComponent } from '../components/player-stats/player-stats.component';
import { PlayerActionComponent } from '../components/player-action/player-action.component';
import { SpellComponent } from '../components/spell/spell.component';

enum ActivationType {
  Action = 1,
  BonusAction = 3,
  Reaction = 4,
  Other = 8
}
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
  imports: [
    PRIMENG_IMPORTS,
    PlayerBaseComponent,
    PlayerStatsComponent,
    PlayerActionComponent,
    SpellComponent,
  ],
  templateUrl: './personaje.html',
  styleUrl: './personaje.css',
})
export class Personaje implements OnInit {
  ALLOWED_SOURCES = ALLOWED_SOURCES;
  loading = true;
  spells: Map<string, any> = new Map();
  classInfo: any;
  private cdr = inject(ChangeDetectorRef);
  protected entryProcessor = inject(EntryProcessorService);

  characterName: string = '';
  character: any;
  characterStats: stats = {
    strength: 0,
    dexterity: 0,
    constitution: 0,
    intelligence: 0,
    wisdom: 0,
    charisma: 0,
  };
  characterSpells: any;
  characterClases: any;
  characterRace: any;
  racesData: any;
  characterClasesData: any;
  characterRaceData: any;
  characterActions: any;
  characterBonusActions: any;
  characterReactionActions: any;
  characterOtherActions: any;

  constructor(
    private readonly jsonReader: JsonReader,
    private readonly route: ActivatedRoute,
  ) {}

  async ngOnInit() {
    // Obtener el nombre del personaje de la URL
    this.route.params.subscribe((params) => {
      this.characterName = params['nombre'];
    });

    try {
      this.spells = new Map();

      const result = await this.jsonReader.getData('characters/' + this.characterName + '.json');
      this.character = result.data;
      console.log('Personaje cargado: ', this.character);
      this.loadStats();
      console.log('Stats cargadas: ', this.characterStats);
      // TODO all spells
      const spellsResult = await this.jsonReader.getData('spells/spells-phb.json');
      if (spellsResult?.spell && Array.isArray(spellsResult.spell)) {
        for (const spell of spellsResult.spell) {
          this.spells.set(spell.name, spell);
        }
      }
      console.log('Spells cargados');
      this.loadSpells();
      console.log('Spells personaje cargados: ', this.characterSpells);
      // Necesito la info de su clase (class-bard.json)
      await this.loadClassData();
      console.log('Clases personaje cargado: ', this.characterClasesData);
      await this.loadRaceData();
      console.log('Raza data cargado: ', this.characterRaceData)
      this.loadActions();
      console.log('Acciones personaje cargadas: ', this.characterActions);
      this.loadBonusActions();
      console.log('Acciones adicionales personaje cargadas: ', this.characterBonusActions);
      this.loadReactionActions();
      console.log('Reacciones personaje cargadas: ', this.characterReactionActions);
      this.loadOtherActions();
      console.log('Otras acciones personaje cargadas: ', this.characterOtherActions);
    } catch (error) {
      console.log(error);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      console.log('loaded');
    }
  }

  loadStats() {
    this.characterStats.strength = this.character.stats[0].value;
    this.characterStats.dexterity = this.character.stats[1].value;
    this.characterStats.constitution = this.character.stats[2].value;
    this.characterStats.intelligence = this.character.stats[3].value;
    this.characterStats.wisdom = this.character.stats[4].value;
    this.characterStats.charisma = this.character.stats[5].value;

    for (let i in this.character.modifiers.feat) {
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
    let value = Math.trunc((stat - 10) / 2);
    return value >= 0 ? '+' + value : value;
  }

  loadSpells() {
    this.characterSpells = [];
    for (const s of this.character.spells.feat) {
      const spell = this.spells.get(s.definition.name);
      if (spell) {
        this.characterSpells.push(spell);
      }
    }
    for (const c of this.character.classSpells) {
      for (const s of c.spells) {
        const spell = this.spells.get(s.definition.name);
        if (spell) {
          this.characterSpells.push(spell);
        }
      }
    }

    // Sort por level
    this.characterSpells.sort((a: any, b: any) => a.level - b.level);
  }

  async loadClassData() {
    this.characterClases = [];
    this.characterClasesData = [];
    for (const c of this.character.classes) {
      this.characterClases.push(c.definition.name);
      const result = await this.jsonReader.getPageData('class/', c.definition.name);
      this.characterClasesData.push(result);
    }
  }

  async loadRaceData() {
    this.characterRace = this.character?.race?.baseRaceName || this.character?.race?.fullName;
    if (this.racesData == null) {
      this.racesData = await this.jsonReader.getData('races.json');
    }
    this.characterRaceData = this.racesData.race.filter((r: { name: string; source: string; }) => r.name === this.characterRace && ALLOWED_SOURCES.includes(r.source));
  }

  loadActions(): void {
    this.characterActions = this.getActionsByActivationType([ActivationType.Action]);
  }

  loadBonusActions(): void {
    this.characterBonusActions = this.getActionsByActivationType([ActivationType.BonusAction]);
  }

  loadReactionActions(): void {
    this.characterReactionActions = this.getActionsByActivationType([ActivationType.Reaction]);
  }

  loadOtherActions() {
    this.characterOtherActions = this.getActionsByActivationType([ActivationType.Other]);
  }

  private getActionsByActivationType(activationTypes: ActivationType[]): any[] {
    const { race, class: cls, feat } = this.character.actions;
    const allActions = [...race, ...cls, ...feat];

    return allActions.reduce<any[]>((acc, action) => {
      const found = this.findActionOnClass(action.name);
      const type = action.activation?.activationType;

      if (found && activationTypes.includes(type)) {
        acc.push(found);
      }

      return acc;
    }, []);
  }

  findActionOnClass(actionName: string) {
    for (let clases of this.characterClasesData) {
      for (let classFeature of clases.classFeature) {
        if (classFeature.name == actionName && ALLOWED_SOURCES.includes(classFeature.source)) {
          return classFeature;
        }
      }
    }
    for (let races of this.characterRaceData) {
      for (let raceEntry of races.entries) {
        if (raceEntry.name == actionName) {
          return raceEntry;
        }
      }
    }
    return null;
  }
}
