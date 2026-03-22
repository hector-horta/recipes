import Dexie, { type Table } from 'dexie';

// ── Base de datos IndexedDB vía Dexie ──────────────────
class WatiDB extends Dexie {
  cachedRecipes!: Table<any>;
  searchCache!: Table<any>;
  medicalMetadata!: Table<any>;

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
      cachedRecipes: 'id' // Keep id as primary key
    });
  }
}

export const db = new WatiDB();
