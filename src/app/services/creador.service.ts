import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PersonajeCreado, personajeNuevo } from '../models/personaje.model';

const STORAGE_KEY = 'creador-borrador';

/**
 * Estado del personaje que se está creando o editando. Se guarda en sessionStorage
 * para sobrevivir a recargas de la página durante el asistente.
 */
@Injectable({ providedIn: 'root' })
export class CreadorService {
  private readonly subject = new BehaviorSubject<PersonajeCreado>(this.restore() ?? personajeNuevo());
  readonly borrador$ = this.subject.asObservable();

  get borrador(): PersonajeCreado {
    return this.subject.value;
  }

  actualizar(cambios: Partial<PersonajeCreado>): void {
    this.set({ ...this.subject.value, ...cambios });
  }

  /** Empieza un personaje nuevo. */
  nuevo(): void {
    this.set(personajeNuevo());
  }

  /** Carga un personaje existente para editarlo. */
  cargar(personaje: PersonajeCreado): void {
    // Los personajes guardados antes de añadir un campo no lo tienen: se completan con los valores por defecto.
    this.set({ ...personajeNuevo(), ...structuredClone(personaje) });
  }

  private set(personaje: PersonajeCreado): void {
    this.subject.next(personaje);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(personaje));
      }
    } catch {
      /* almacenamiento no disponible: el borrador solo vive en memoria */
    }
  }

  private restore(): PersonajeCreado | null {
    try {
      if (typeof sessionStorage === 'undefined') return null;
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? { ...personajeNuevo(), ...JSON.parse(raw) } : null;
    } catch {
      return null;
    }
  }
}
