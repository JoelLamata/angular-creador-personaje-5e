import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class JsonReader {
  private cache = new Map<string, any>();

  async getData(filename: string): Promise<any> {
    if (this.cache.has(filename)) {
      return this.cache.get(filename);
    }

    const baseUrl = typeof document !== 'undefined'
      ? document.baseURI
      : 'http://localhost:4200/';
    const url = new URL(`assets/${filename}`, baseUrl).href;
    const response = await fetch(url);
    const data = await response.json();
    this.cache.set(filename, data);
    return data;
  }

  async getPageData(path: string, page: string, toLowerCase = true): Promise<any> {
    const index = await this.getData(path + 'index.json');
    return this.getData(path + index[toLowerCase ? page.toLowerCase() : page]);
  }
}
