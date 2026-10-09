import { Injectable } from '@angular/core';
import type { Firestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { PersonajeCreado } from '../models/personaje.model';

/**
 * Acceso a los personajes creados guardados en Firestore. Los personajes de los
 * ficheros JSON (D&D Beyond) no pasan por aquí: son una fuente de datos aparte.
 *
 * El SDK de Firebase se importa de forma diferida y solo en el navegador, para que no
 * entre en el bundle inicial ni se ejecute durante el renderizado en servidor.
 */
@Injectable({ providedIn: 'root' })
export class PersonajesService {
  readonly configurado = !environment.firebase.apiKey.startsWith('REEMPLAZAR');
  private dbPromise: Promise<Firestore> | null = null;

  private db(): Promise<Firestore> {
    if (!this.configurado) {
      return Promise.reject(new Error('Firebase no está configurado (src/environments/environment.ts).'));
    }
    if (typeof window === 'undefined') {
      return Promise.reject(new Error('Firestore solo está disponible en el navegador.'));
    }
    if (!this.dbPromise) {
      this.dbPromise = (async () => {
        const [{ initializeApp, getApps }, { getFirestore }] = await Promise.all([
          import('firebase/app'),
          import('firebase/firestore'),
        ]);
        const app = getApps()[0] ?? initializeApp(environment.firebase);
        return getFirestore(app);
      })();
    }
    return this.dbPromise;
  }

  async listar(): Promise<PersonajeCreado[]> {
    const db = await this.db();
    const { collection, getDocs } = await import('firebase/firestore');
    const snap = await getDocs(collection(db, environment.coleccion));
    return snap.docs
      .map((d) => ({ ...(d.data() as PersonajeCreado), id: d.id }))
      .sort((a, b) => (b.actualizadoEn ?? 0) - (a.actualizadoEn ?? 0));
  }

  async obtener(id: string): Promise<PersonajeCreado | null> {
    const db = await this.db();
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, environment.coleccion, id));
    return snap.exists() ? { ...(snap.data() as PersonajeCreado), id: snap.id } : null;
  }

  /** Crea o actualiza el personaje y devuelve su id. */
  async guardar(personaje: PersonajeCreado): Promise<string> {
    const db = await this.db();
    const { collection, doc, setDoc } = await import('firebase/firestore');
    const ahora = Date.now();
    const { id, ...datos } = personaje;
    const ref = id ? doc(db, environment.coleccion, id) : doc(collection(db, environment.coleccion));
    // JSON elimina los `undefined`, que Firestore rechaza.
    const limpio = JSON.parse(
      JSON.stringify({ ...datos, creadoEn: datos.creadoEn ?? ahora, actualizadoEn: ahora }),
    );
    await setDoc(ref, limpio);
    return ref.id;
  }

  async borrar(id: string): Promise<void> {
    const db = await this.db();
    const { doc, deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, environment.coleccion, id));
  }
}
