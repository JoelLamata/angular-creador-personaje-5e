# Componentes de Características de Clase (Class Features)

## Descripción General

Este módulo proporciona componentes reutilizables y con soporte de temas para mostrar características de clases de D&D 5e. Está diseñado con un enfoque mobile-first y totalmente basado en tokens CSS para máxima flexibilidad.

---

## 🎨 Arquitectura de Componentes

### 1. `ClassFeatureCardComponent`

Componente autónomo que representa una característica individual dentro de un accordion.

#### **Ubicación**
```
src/app/components/class-feature-card/
├── class-feature-card.component.ts
├── class-feature-card.component.html
└── class-feature-card.component.scss
```

#### **Inputs**

| Input | Tipo | Descripción |
|-------|------|-------------|
| `feature` | `ClassFeature` | Objeto con datos de la característica |
| `index` | `number` | Índice del panel en el accordion (por defecto 0) |

#### **Interfaz ClassFeature**

```typescript
export interface ClassFeature {
  name: string;           // Nombre de la característica (ej: "Rage")
  className: string;      // Clase a la que pertenece (ej: "Barbarian")
  classSource: string;    // Fuente de la clase (ej: "PHB")
  level: number;          // Nivel al que se desbloquea (1-20)
  source: string;         // Fuente de la característica (ej: "XPHB")
  entries: any[];         // Array con descripción completa
  page?: number;          // Página en el libro (opcional)
  srd?: boolean;          // Si está en el SRD (opcional)
}
```

#### **Uso Básico**

```typescript
import { ClassFeatureCardComponent } from './components/class-feature-card/class-feature-card.component';

// En tu componente
@Component({
  selector: 'app-my-component',
  imports: [ClassFeatureCardComponent, PRIMENG_IMPORTS],
  template: `
    <p-accordion>
      <app-class-feature-card 
        [feature]="myFeature" 
        [index]="0">
      </app-class-feature-card>
    </p-accordion>
  `
})
export class MyComponent {
  myFeature: ClassFeature = {
    name: 'Rage',
    className: 'Barbarian',
    classSource: 'XPHB',
    level: 1,
    source: 'XPHB',
    entries: ['In battle, you fight with primal ferocity...']
  };
}
```

#### **Características**

✅ **Autónomo**: No depende de estilos del padre  
✅ **Responsive**: Diseño mobile-first con breakpoints en 768px  
✅ **Temable**: Usa CSS Custom Properties para colores por clase  
✅ **Accesible**: Usa PrimeNG accordion con ARIA labels  
✅ **Flexible**: Soporta contenido HTML complejo en entries  

---

### 2. `ClasesComponent` (Componente Refactorizado)

Componente contenedor que carga, filtra y muestra todas las características de clase en un accordion.

#### **Ubicación**
```
src/app/clases/
├── clases.ts
├── clases.html
└── clases.scss
```

#### **Ruta**
```
/clases
```

#### **Funcionalidades**

| Función | Descripción |
|---------|-------------|
| Carga de datos | Lee todas las características de todas las clases (class/class-*.json) |
| Filtro por nivel | Dropdown con niveles 1-20 |
| Búsqueda | Busca en nombre, clase y fuente |
| Contador | Muestra cantidad de resultados |
| Limpiar filtros | Botón para resetear todos los filtros |
| Estado vacío | Mensaje amigable cuando no hay resultados |

#### **Código Relevante (clases.ts)**

```typescript
// Métodos públicos disponibles
applyFilters(): void;     // Aplica filtros actuales
onSearchChange(): void;   // Maneja cambios de búsqueda
onLevelChange(): void;    // Maneja cambios de nivel
clearFilters(): void;     // Limpia todos los filtros

// Propiedades
allClassFeatures: ClassFeature[];       // Todas las características
filteredClassFeatures: ClassFeature[]; // Características filtradas
selectedLevel: number | null;           // Nivel seleccionado
searchText: string;                     // Texto de búsqueda
availableLevels: number[];              // Niveles disponibles
```

---

## 🎯 Sistema de Temas (Light/Dark)

### Tokens CSS Disponibles

#### **Colores por Clase** (definidos en `_tokens.scss`)

Light theme:
```scss
--player-class-barbarian: #7c2d12;
--player-class-bard: #7c3aed;
--player-class-cleric: #dc2626;
--player-class-druid: #059669;
--player-class-fighter: #1e40af;
--player-class-monk: #831843;
--player-class-paladin: #b91c1c;
--player-class-ranger: #15803d;
--player-class-rogue: #1f2937;
--player-class-sorcerer: #be185d;
--player-class-warlock: #3730a3;
--player-class-wizard: #0369a1;
--player-class-artificer: #6366f1;
```

Dark theme: Automáticamente sobrescrito en `.dark { }`

#### **Cómo Activar Tema Oscuro**

```typescript
// En tu componente raíz (app.ts)
export class AppComponent {
  toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
  }
}
```

En HTML:
```html
<button (click)="toggleDarkMode()" class="theme-toggle">
  🌙 Tema Oscuro
</button>
```

---

## 📱 Diseño Responsive

### Breakpoints

| Tamaño | Ancho | Comportamiento |
|--------|-------|-----------------|
| Mobile | < 768px | Stacked vertical, full width |
| Tablet | ≥ 768px | Layout side-by-side, optimizado |
| Desktop | ≥ 1024px | Layout completo con max-width |

### Ejemplos

**Mobile (< 768px)**
- Filtros apilados verticalmente
- Búsqueda a full width
- Dropdown de nivel full width

**Desktop (≥ 768px)**
- Filtros en fila (flex-row)
- Búsqueda y dropdown lado a lado
- Botón "Limpiar" alineado a la derecha

---

## 🔧 Extensión: Agregar Nuevas Clases

### Si se agrega una nueva clase de D&D:

1. **Agregar token CSS** en `src/styles/_tokens.scss`:

```scss
:root {
  --player-class-mysticclass: #hexcolor;
  --player-class-mysticclass-light: #hexcolor;
}

.dark {
  --player-class-mysticclass: #hexcolor;
  --player-class-mysticclass-light: #hexcolor;
}
```

2. **Agregar color en el componente** en `src/app/components/class-feature-card/class-feature-card.component.scss`:

```scss
.badge-class {
  &[data-class='mysticclass'] {
    background-color: var(--player-class-mysticclass);
  }
}
```

3. El componente automáticamente usará `getNormalizedClassName()` para mapear el nombre de la clase.

---

## 🧪 Testing

### Ejemplo de test para ClassFeatureCardComponent

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClassFeatureCardComponent, ClassFeature } from './class-feature-card.component';

describe('ClassFeatureCardComponent', () => {
  let component: ClassFeatureCardComponent;
  let fixture: ComponentFixture<ClassFeatureCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClassFeatureCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ClassFeatureCardComponent);
    component = fixture.componentInstance;
  });

  it('should render feature name', () => {
    const mockFeature: ClassFeature = {
      name: 'Rage',
      className: 'Barbarian',
      classSource: 'XPHB',
      level: 1,
      source: 'XPHB',
      entries: []
    };

    component.feature = mockFeature;
    fixture.detectChanges();

    const compiled = fixture.nativeElement;
    expect(compiled.querySelector('.feature-name')?.textContent).toContain('Rage');
  });

  it('should return correct class color var', () => {
    const mockFeature: ClassFeature = {
      name: 'Rage',
      className: 'Barbarian',
      classSource: 'XPHB',
      level: 1,
      source: 'XPHB',
      entries: []
    };

    component.feature = mockFeature;
    expect(component.getClassColorVar()).toBe('var(--player-class-barbarian)');
  });
});
```

---

## 📚 Referencia de Archivos Afectados

| Archivo | Cambio |
|---------|--------|
| `src/styles/_tokens.scss` | ✅ Agregados tokens de colores de clase |
| `src/app/clases/clases.ts` | ✅ Refactorizado para cargar todas las características |
| `src/app/clases/clases.html` | ✅ Nueva interfaz con accordion y filtros |
| `src/app/clases/clases.scss` | ✅ Nuevos estilos responsive |
| `src/app/components/class-feature-card/*` | ✅ Nuevo componente reutilizable |
| `src/app/app.routes.ts` | ✅ Removida ruta `/clases/:page` |

---

## 🚀 Próximos Pasos

1. ✅ Verificar funcionamiento en temas light/dark
2. ✅ Testar responsiveness en dispositivos móviles
3. ✅ Agregar más características si es necesario
4. ⏳ Considerar agregar paginación si el número de características crece

---

## 📖 Recursos D&D 5e

- XPHB: Player's Handbook (2024 Reprint)
- PHB: Player's Handbook (Original)
- Otros libros según disponibilidad en la BD

## 🎨 Paleta de Colores D&D

Los colores de las clases están basados en la identidad visual de D&D 5e:

- **Barbarian**: Naranja/Marrón (ira primitiva)
- **Bard**: Púrpura (magia arcana)
- **Cleric**: Rojo (furor divino)
- **Druid**: Verde (naturaleza)
- **Fighter**: Azul (disciplina)
- **Monk**: Rosa (equilibrio)
- **Paladin**: Rojo oscuro (honor)
- **Ranger**: Verde claro (exploración)
- **Rogue**: Gris (sigilo)
- **Sorcerer**: Rosa magenta (caos)
- **Warlock**: Índigo (pacto oscuro)
- **Wizard**: Cian (conocimiento)
- **Artificer**: Índigo (artificios)
