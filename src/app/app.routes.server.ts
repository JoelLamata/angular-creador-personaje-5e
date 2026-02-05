import { RenderMode, ServerRoute } from '@angular/ssr';
import { routesClases } from './routes-clases';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'clases/:page',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const pages = routesClases;
      return pages.map(page => ({page}))
    }
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
