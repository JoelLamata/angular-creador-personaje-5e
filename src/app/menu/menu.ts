import { Component, OnInit } from '@angular/core';
import { MenuModule } from 'primeng/menu';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-menu',
  imports: [MenuModule, ButtonModule],
  templateUrl: './menu.html',
  providers: [MessageService]
})
export class Menu implements OnInit {
  items: MenuItem[] | undefined;

  ngOnInit(): void {
    this.items = [
      {
        label: 'Navigate',
        items: [
          {
            label: 'Clases',
            routerLink: '/clases'
          },
          {
            label: 'Hechizos',
            routerLink: '/hechizos'
          },
          {
            label: 'Especies',
            routerLink: '/especies'
          },
          {
            label: 'Trasfondos',
            routerLink: '/trasfondos'
          },
        ]
      }
    ]
  }
}
