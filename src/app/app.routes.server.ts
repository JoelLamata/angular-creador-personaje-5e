import { RenderMode, ServerRoute } from '@angular/ssr';
import { routesClases } from './routes-clases';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
