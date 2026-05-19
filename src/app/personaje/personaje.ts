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
  protected readonly ActivationType = ActivationType;
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
  characterActions: any[] = [];
  characterBonusActions: any[] = [];
  characterReactionActions: any[] = [];
  characterOtherActions: any[] = [];

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
      this.loadActions();
      console.log('Acciones personaje cargadas: ', this.characterActions);
      await this.loadSpells();
      console.log('Spells personaje cargados: ', this.characterSpells);
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

  async loadSpells() {
    const spellsResult = await this.jsonReader.getSpellsData();
    if (spellsResult && Array.isArray(spellsResult)) {
      for (const spell of spellsResult) {
        this.spells.set(spell.name, spell);
      }
    }
    console.log('Spells cargados');

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

  loadActions(): void {
    const actions = this.character?.actions;

    this.characterActions = this.mergeActions(
      actions?.background,
      actions?.class,
      actions?.feat,
      actions?.item,
      actions?.race
    );

    this.characterActions.sort(
      (a, b) =>
        (a.activation?.activationType ?? Number.MAX_SAFE_INTEGER) -
        (b.activation?.activationType ?? Number.MAX_SAFE_INTEGER)
    );
  }

  private mergeActions(...actionLists: (any[] | null | undefined)[]): any[] {
    return actionLists.flatMap(actions => actions ?? []);
  }
}
