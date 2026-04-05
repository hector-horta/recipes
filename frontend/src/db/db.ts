import Dexie, { type Table } from 'dexie';

class WatiDB extends Dexie {
  cachedRecipes!: Table<any>;
  searchCache!: Table<any>;
  medicalMetadata!: Table<any>;
  cachedImages!: Table<any>;

  constructor() {
    super('WatiDB');
    this.version(1).stores({
      cachedRecipes: 'id',
      medicalMetadata: 'id'
    });

    this.version(2).stores({
      cachedRecipes: 'id, query'
    });

    this.version(3).stores({
      searchCache: 'query',
      cachedRecipes: 'id'
    });

    this.version(4).stores({
      searchCache: 'query',
      cachedRecipes: 'id',
      cachedImages: 'url'
    });
  }
}

export const db = new WatiDB();
