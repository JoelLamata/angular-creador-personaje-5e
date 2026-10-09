import { RenderMode, ServerRoute } from '@angular/ssr';
import { routesClases } from './routes-clases';

export const serverRoutes: ServerRoute[] = [
  // Páginas interactivas que dependen de Firestore o del borrador del navegador: solo cliente.
  { path: 'crear', renderMode: RenderMode.Client },
  { path: 'crear/**', renderMode: RenderMode.Client },
  { path: 'creados', renderMode: RenderMode.Client },
  { path: 'creados/**', renderMode: RenderMode.Client },
  { path: 'editar/**', renderMode: RenderMode.Client },
  {
    path: ':nombre',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const pages = routesClases;
      return pages.map((page) => ({ page }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
