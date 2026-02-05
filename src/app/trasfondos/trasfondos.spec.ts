import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Trasfondos } from './trasfondos';

describe('Trasfondos', () => {
  let component: Trasfondos;
  let fixture: ComponentFixture<Trasfondos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Trasfondos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Trasfondos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
