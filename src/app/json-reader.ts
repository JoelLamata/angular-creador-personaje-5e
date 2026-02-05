import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom, Observable, of, shareReplay, switchMap, take, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class JsonReader {
  constructor(private readonly http: HttpClient) {}
  private data: Record<string, any> = {};

  async getData(filename: string): Promise<any> {
    if (this.data[filename]) {
      return this.data[filename];
    }

    const result = this.http.get(`/assets/${filename}`).pipe(take(1));

    this.data[filename] = result;
    return await lastValueFrom(result);
  }

  async getPageData(path: string, page: string): Promise<any> {
    const index = await this.getData(path + 'index.json');
    return this.getData(path + index[page]);
  }
}
