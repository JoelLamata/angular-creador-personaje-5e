import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PlayerSelectorComponent } from '../components/player-selector/player-selector.component';

@Component({
  selector: 'app-seleccion-personaje',
  imports: [CommonModule, PlayerSelectorComponent],
  templateUrl: './seleccion-personaje.html',
  styleUrl: './seleccion-personaje.css',
})
export class SeleccionPersonaje implements OnInit {
  personajes: string[] = [
    'Dubidua',
    'Dustin Power',
    'Hopper Chispacero',
    'Nalissa',
    'Rym',
    'Vespera Silversong',
    'Zella',
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {}

  seleccionarPersonaje(nombre: string): void {
    this.router.navigate([`/${nombre}`]);
  }
}
