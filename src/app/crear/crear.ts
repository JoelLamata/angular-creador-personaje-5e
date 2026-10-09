import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CreadorService } from '../services/creador.service';

/** Contenedor del asistente: barra de pasos, resumen lateral y salida de los pasos. */
@Component({
  selector: 'app-crear',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe],
  templateUrl: './crear.html',
  styleUrl: './crear.scss',
})
export class CrearPersonaje {
  protected readonly creador = inject(CreadorService);

  protected readonly pasos = [
    { ruta: '/crear/clase', etiqueta: 'Clase' },
    { ruta: '/crear/especie', etiqueta: 'Especie' },
    { ruta: '/crear/trasfondo', etiqueta: 'Trasfondo' },
    { ruta: '/crear/habilidades', etiqueta: 'Puntuaciones' },
    { ruta: '/crear/rasgos', etiqueta: 'Rasgos' },
    { ruta: '/crear/equipo', etiqueta: 'Equipo y hechizos' },
    { ruta: '/crear/resumen', etiqueta: 'Resumen' },
  ];

  protected nuevo(): void {
    if (confirm('¿Descartar el borrador actual y empezar un personaje nuevo?')) {
      this.creador.nuevo();
    }
  }
}
