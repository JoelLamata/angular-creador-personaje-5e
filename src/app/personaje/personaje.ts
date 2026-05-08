import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PRIMENG_IMPORTS } from '../primeng.imports';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ALLOWED_SOURCES } from '../sourcesConfigService';
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
  ALLOWED_SOURCES = ALLOWED_SOURCES;
  loading = true;
  spells: Map<string, any> = new Map();
  classInfo: any;
  private cdr = inject(ChangeDetectorRef);

  characterName: string = "";
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
  characterClases: any;
  characterClasesData: any;
  characterActions: any;

  constructor(
    private readonly jsonReader: JsonReader,
    private readonly sanitizer: DomSanitizer,
    private readonly route: ActivatedRoute
  ) {}

  async ngOnInit() {
    // Obtener el nombre del personaje de la URL
    this.route.params.subscribe(params => {
      this.characterName = params['nombre'];
    });

    try {
      this.spells = new Map();

      const result = await this.jsonReader.getData('characters/' + this.characterName + '.json');
      this.character = result.data;
      console.log("Personaje cargado: ", this.character)
      this.loadStats()
      console.log("Stats cargadas: ", this.characterStats)
      // TODO all spells
      const spellsResult = await this.jsonReader.getData('spells/spells-phb.json')
      if (spellsResult?.spell && Array.isArray(spellsResult.spell)) {
        for (const spell of spellsResult.spell) {
          this.spells.set(spell.name, spell);
        }
      }
      console.log("Spells cargados")
      this.loadSpells();
      console.log("Spells personaje cargados: ", this.characterSpells)
      // Necesito la info de su clase (class-bard.json)
      await this.loadClassData();
      console.log("Clases personaje cargado: ", this.characterClasesData)
      this.loadActions();
      console.log("Acciones personaje cargadas: ", this.characterActions)
    } catch(error) {
      console.log(error)
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
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
      this.characterClases.push(c.definition.name)
      const result = await this.jsonReader.getPageData('class/', c.definition.name);
      this.characterClasesData.push(result)
    }
  }

  loadActions() {
    this.characterActions = [];
    let currentAction = null;
    const actions = this.character.actions;
    for (const a of actions.race) {
      currentAction = this.findActionOnClass(a.name)
      if (currentAction != null) {
        this.characterActions.push(currentAction)
      }
    }
    for (const a of actions.class) {
      currentAction = this.findActionOnClass(a.name)
      if (currentAction != null) {
        this.characterActions.push(currentAction)
      }
    }
    for (const a of actions.feat) {
      currentAction = this.findActionOnClass(a.name)
      if (currentAction != null) {
        this.characterActions.push(currentAction)
      }
    }
  }

  findActionOnClass(actionName: string) {
    for(let clases of this.characterClasesData) {
      for(let classFeature of clases.classFeature) {
        if (classFeature.name == actionName && ALLOWED_SOURCES.includes(classFeature.source)) {
          return classFeature
        }
      }
    }
    return null
  }

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
