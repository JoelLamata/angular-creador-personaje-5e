import { Component, OnInit } from '@angular/core';
import { MegaMenuModule } from 'primeng/megamenu';
import { MegaMenuItem } from 'primeng/api';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu',
  imports: [MegaMenuModule, CommonModule],
  templateUrl: './menu.html',
  styleUrl: './menu.scss',
})
export class Menu implements OnInit {
  items: MegaMenuItem[] | undefined;
  isDarkMode = false;

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
    ];

    if (typeof localStorage !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
        this.isDarkMode = true;
      } else {
        document.documentElement.classList.remove('dark');
        this.isDarkMode = false;
      }
    }
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
    }
  }
}

