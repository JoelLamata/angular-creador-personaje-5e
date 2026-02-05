import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClasesDetalle } from './clases-detalle';

describe('ClasesDetalle', () => {
  let component: ClasesDetalle;
  let fixture: ComponentFixture<ClasesDetalle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClasesDetalle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClasesDetalle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
