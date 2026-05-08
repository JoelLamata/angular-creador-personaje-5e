import { Component, OnInit } from '@angular/core';
import { MegaMenuModule } from 'primeng/megamenu';
import { MegaMenuItem } from 'primeng/api';

@Component({
  selector: 'app-menu',
  imports: [MegaMenuModule],
  templateUrl: './menu.html',
})
export class Menu implements OnInit {
  items: MegaMenuItem[] | undefined;

  ngOnInit(): void {
    this.items = [
      {
        label: 'Personajes',
        routerLink: ['/']
      },
      {
        label: 'Clases',
        routerLink: ['/clases']
      },
      {
        label: 'Hechizos',
        routerLink: ['/hechizos']
      },
      {
        label: 'Especies',
        routerLink: ['/especies']
      },
      {
        label: 'Trasfondos',
        routerLink: ['/trasfondos']
      }
    ]
  }
}
