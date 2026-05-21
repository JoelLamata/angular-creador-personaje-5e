import { Routes } from '@angular/router';
import { Clases } from './clases/clases';
import { Hechizos } from './hechizos/hechizos';
import { Especies } from './especies/especies';
import { Trasfondos } from './trasfondos/trasfondos';
import { Personaje } from './personaje/personaje';
import { SeleccionPersonaje } from './seleccion-personaje/seleccion-personaje';

export const routes: Routes = [
  { path: 'clases', component: Clases },
  { path: 'hechizos', component: Hechizos },
  { path: 'especies', component: Especies },
  { path: 'trasfondos', component: Trasfondos },
  { path: ':nombre', component: Personaje },
  { path: '', component: SeleccionPersonaje }
];
