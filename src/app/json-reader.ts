import { Injectable } from '@angular/core';
import { inlineSubclassRefs, parseSubclassFeatureKey, resolveCopies } from './utils/dnd-resolver';

@Injectable({
  providedIn: 'root',
})
export class JsonReader {
  private cache = new Map<string, any>();

  async getData(filename: string): Promise<any> {
    if (this.cache.has(filename)) {
      return this.cache.get(filename);
    }

    const baseUrl = typeof document !== 'undefined' ? document.baseURI : 'http://localhost:4200/';
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

  async getSpellsData(): Promise<any> {
    const cacheKey = 'spells/all';

    // Reutilizamos la caché para evitar cargar todos los archivos varias veces
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const index: Record<string, string> = await this.getData('spells/index.json');
    const files = Object.values(index).filter(Boolean);
    const responses = await Promise.all(
      files.map((file) => this.getData(`spells/${file}`) as Promise<any>),
    );

    const spells = responses.flatMap((r) => r.spell ?? []);
    this.cache.set(cacheKey, spells);

    return spells;
  }

  async getAllData(path: string) {
    const index: Record<string, string> = await this.getData(path + '/index.json');
    const files = Object.values(index).filter(Boolean);
    const responses = await Promise.all(
      files.map((file) => this.getData(`${path}/${file}`) as Promise<any>),
    );

    return responses;
  }

  async getClassAndSubClassData() {
    const cacheKey = 'class/all-features';

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const responses = await this.getAllData('class');

    const result = responses.flatMap((r) => {
      const classFeatures = resolveCopies<any>(
        r.classFeature ?? [],
        (b, c) => b.name === c.name && b.source === c.source && b.className === c.className,
      );
      const subclassFeatures = resolveCopies<any>(
        r.subclassFeature ?? [],
        (b, c) =>
          b.name === c.name &&
          b.source === c.source &&
          b.className === c.className &&
          b.classSource === c.classSource &&
          b.subclassShortName === c.subclassShortName &&
          b.subclassSource === c.subclassSource,
      );
      const lookup = (key: string) => {
        const k = parseSubclassFeatureKey(key);
        return subclassFeatures.find(
          (f) =>
            f.name === k.name &&
            f.className === k.className &&
            f.subclassShortName === k.subclassShortName &&
            f.subclassSource === k.subclassSource &&
            f.level === k.level,
        );
      };
      const inlined = subclassFeatures.map((f) => ({
        ...f,
        entries: inlineSubclassRefs(f.entries, lookup, new Set<string>()),
      }));
      return [...classFeatures, ...inlined];
    });

    this.cache.set(cacheKey, result);

    return result;
  }
}
