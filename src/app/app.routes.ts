import { Routes } from '@angular/router';
import { Clases } from './clases/clases';
import { Hechizos } from './hechizos/hechizos';
import { Especies } from './especies/especies';
import { Trasfondos } from './trasfondos/trasfondos';
import { Dotes } from './dotes/dotes';
import { Objetos } from './objetos/objetos';
import { Personaje } from './personaje/personaje';
import { SeleccionPersonaje } from './seleccion-personaje/seleccion-personaje';
import { CrearPersonaje } from './crear/crear';
import { PasoClase } from './crear/paso-clase/paso-clase';
import { PasoClaseDetalle } from './crear/paso-clase-detalle/paso-clase-detalle';
import { PasoEspecie } from './crear/paso-especie/paso-especie';
import { PasoEspecieDetalle } from './crear/paso-especie-detalle/paso-especie-detalle';
import { PasoTrasfondo } from './crear/paso-trasfondo/paso-trasfondo';
import { PasoHabilidades } from './crear/paso-habilidades/paso-habilidades';
import { PasoRasgos } from './crear/paso-rasgos/paso-rasgos';
import { PasoEquipo } from './crear/paso-equipo/paso-equipo';
import { PasoResumen } from './crear/paso-resumen/paso-resumen';
import { PersonajesCreados } from './personajes-creados/personajes-creados';
import { FichaPersonajeCreado } from './personajes-creados/ficha-personaje-creado';
import { EditarPersonaje } from './personajes-creados/editar-personaje';

// Las rutas fijas van antes de ':nombre', que captura cualquier segmento.
export const routes: Routes = [
  { path: 'clases', component: Clases },
  { path: 'hechizos', component: Hechizos },
  { path: 'especies', component: Especies },
  { path: 'trasfondos', component: Trasfondos },
  { path: 'dotes', component: Dotes },
  { path: 'objetos', component: Objetos },
  {
    path: 'crear',
    component: CrearPersonaje,
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'clase' },
      { path: 'clase', component: PasoClase },
      { path: 'clase/:clase', component: PasoClaseDetalle },
      { path: 'especie', component: PasoEspecie },
      { path: 'especie/:id', component: PasoEspecieDetalle },
      { path: 'trasfondo', component: PasoTrasfondo },
      { path: 'habilidades', component: PasoHabilidades },
      { path: 'rasgos', component: PasoRasgos },
      { path: 'equipo', component: PasoEquipo },
      { path: 'resumen', component: PasoResumen },
    ],
  },
  { path: 'creados', component: PersonajesCreados },
  { path: 'creados/:id', component: FichaPersonajeCreado },
  { path: 'editar/:id', component: EditarPersonaje },
  { path: ':nombre', component: Personaje },
  { path: '', component: SeleccionPersonaje }
];
