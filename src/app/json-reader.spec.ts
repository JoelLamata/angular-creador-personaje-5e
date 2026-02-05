import { TestBed } from '@angular/core/testing';

import { JsonReader } from './json-reader';

describe('JsonReader', () => {
  let service: JsonReader;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(JsonReader);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
