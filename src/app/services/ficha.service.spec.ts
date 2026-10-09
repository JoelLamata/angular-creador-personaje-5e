import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TestBed } from '@angular/core/testing';
import { JsonReader } from '../json-reader';
import { PersonajeCreado, personajeNuevo, puntuacionesVacias } from '../models/personaje.model';
import { Ficha, FichaService } from './ficha.service';

class LectorDeDisco {
  async getData(nombre: string) {
    return JSON.parse(readFileSync(join(process.cwd(), 'public', 'assets', nombre), 'utf8'));
  }
}

describe('FichaService (datos reales)', () => {
  let servicio: FichaService;

  /** Personaje de nivel `nivel` con todas las puntuaciones a 10 (modificador +0), salvo Destreza 14. */
  const personaje = (clase: string, nivel: number, extra: Partial<PersonajeCreado> = {}): PersonajeCreado => ({
    ...personajeNuevo(),
    nombre: 'Prueba',
    clase: { name: clase, source: 'XPHB' },
    nivel,
    especie: { name: 'Human', source: 'XPHB' },
    trasfondo: { name: 'Sage', source: 'XPHB' },
    puntuacionesBase: { ...puntuacionesVacias(10), dex: 14 },
    bonosTrasfondo: puntuacionesVacias(0),
    ...extra,
  });
  const habilidad = (f: Ficha, nombre: string) => f.habilidades.find((h) => h.nombre === nombre)!;

  beforeAll(() => {
    TestBed.configureTestingModule({ providers: [{ provide: JsonReader, useClass: LectorDeDisco }] });
    servicio = TestBed.inject(FichaService);
  });

  describe('Jack of All Trades', () => {
    it('el Bard de nivel 2 suma la mitad de competencia a las habilidades sin competencia', async () => {
      const f = await servicio.construir(personaje('Bard', 2));
      // Nivel 2: bonificador +2, mitad = +1.
      const nature = habilidad(f, 'Nature');
      expect(nature.competente).toBe(false);
      expect(nature.mediaCompetencia).toBe(true);
      expect(nature.mod).toBe(1);
    });

    it('redondea hacia abajo: con competencia +3 (nivel 5) la mitad es +1', async () => {
      const f = await servicio.construir(personaje('Bard', 5));
      expect(f.bonusCompetencia).toBe(3);
      expect(habilidad(f, 'Nature').mod).toBe(1);
    });

    it('con competencia +4 (nivel 9) la mitad es +2', async () => {
      const f = await servicio.construir(personaje('Bard', 9));
      expect(habilidad(f, 'Nature').mod).toBe(2);
    });

    it('no se aplica a las habilidades en las que ya hay competencia', async () => {
      const f = await servicio.construir(personaje('Bard', 5, { habilidadesClase: ['stealth'] }));
      const sigilo = habilidad(f, 'Stealth');
      expect(sigilo.competente).toBe(true);
      expect(sigilo.mediaCompetencia).toBe(false);
      // Destreza 14 (+2) + competencia completa +3, sin la mitad.
      expect(sigilo.mod).toBe(2 + 3);
    });

    it('no se aplica a las habilidades con Expertise', async () => {
      const f = await servicio.construir(
        personaje('Bard', 5, {
          habilidadesClase: ['stealth'],
          elecciones: { 'Bard|Expertise|2|0': ['stealth'] },
        }),
      );
      const sigilo = habilidad(f, 'Stealth');
      expect(sigilo.experto).toBe(true);
      expect(sigilo.mediaCompetencia).toBe(false);
      expect(sigilo.mod).toBe(2 + 3 + 3);
    });

    it('antes de nivel 2 el Bard todavía no lo tiene', async () => {
      const f = await servicio.construir(personaje('Bard', 1));
      expect(habilidad(f, 'Nature').mediaCompetencia).toBe(false);
      expect(habilidad(f, 'Nature').mod).toBe(0);
    });

    it('otras clases no lo tienen', async () => {
      const f = await servicio.construir(personaje('Fighter', 5));
      expect(f.habilidades.some((h) => h.mediaCompetencia)).toBe(false);
      expect(habilidad(f, 'Nature').mod).toBe(0);
    });

    it('no se suma a la iniciativa, que sigue siendo solo el modificador de Destreza', async () => {
      const bardo = await servicio.construir(personaje('Bard', 5));
      const guerrero = await servicio.construir(personaje('Fighter', 5));
      expect(guerrero.iniciativa).toBe(2);
      expect(bardo.iniciativa).toBe(2);
    });
  });
});
