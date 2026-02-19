import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Personaje } from './personaje';

describe('Personaje', () => {
  let component: Personaje;
  let fixture: ComponentFixture<Personaje>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Personaje]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Personaje);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
