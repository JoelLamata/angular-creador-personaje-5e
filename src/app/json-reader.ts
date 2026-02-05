import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class JsonReader {
  private readonly baseUrl = 'assets/';
  constructor(private readonly http: HttpClient){}

  getData(filename: string): Observable<any> {
    return this.http.get<any>(`assets/${filename}`)
  }

  getIndex(filename: string) {
    return this.http.get<Record<string, string>>(`assets/${filename}`)
  }
}
