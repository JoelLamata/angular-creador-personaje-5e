import { Routes } from '@angular/router';
import { Clases } from './clases/clases.ts';
import { Hechizos } from './hechizos/hechizos.ts';
import { Especies } from './especies/especies.ts';
import { Trasfondos } from './trasfondos/trasfondos.ts';

export const routes: Routes = [
  { path: 'clases', component: Clases },
  { path: 'hechizos', component: Hechizos },
  { path: 'especies', component: Especies },
  { path: 'trasfondos', component: Trasfondos },
  { path: '', component: Clases }
];
