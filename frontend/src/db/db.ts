import Dexie, { type Table } from 'dexie';
import CryptoJS from 'crypto-js';

// ── Tipos ──────────────────────────────────────────────
export interface UserProfile {
  id?: number;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl: string;
  intolerances: string[];
  severities: Record<string, 'mild' | 'moderate' | 'severe' | 'anaphylactic'>;
  conditions: string[];
  onboardingComplete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Base de datos IndexedDB vía Dexie ──────────────────
class WatiDB extends Dexie {
  users!: Table<UserProfile>;
  cachedRecipes!: Table<any>;
  medicalMetadata!: Table<any>;

  constructor() {
    super('WatiDB');
    this.version(1).stores({
      users: '++id, &email',
      cachedRecipes: 'id',
      medicalMetadata: 'id'
    });

    this.version(2).stores({
      cachedRecipes: 'id, query'
    });
  }
}

export const db = new WatiDB();

// ── Helpers de autenticación ───────────────────────────
const hashPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};

export const AuthDB = {
  async register(email: string, password: string, displayName: string): Promise<UserProfile> {
    const existing = await db.users.where('email').equals(email).first();
    if (existing) {
      throw new Error('Ya existe una cuenta con este correo electrónico.');
    }

    const profile: UserProfile = {
      email,
      passwordHash: hashPassword(password),
      displayName,
      avatarUrl: '',
      intolerances: [],
      severities: {},
      conditions: [],
      onboardingComplete: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const id = await db.users.add(profile);
    return { ...profile, id: id as number };
  },

  async login(email: string, password: string): Promise<UserProfile> {
    const user = await db.users.where('email').equals(email).first();
    if (!user) {
      throw new Error('No se encontró una cuenta con ese correo.');
    }
    if (user.passwordHash !== hashPassword(password)) {
      throw new Error('Contraseña incorrecta.');
    }
    return user;
  },

  async updateProfile(
    userId: number,
    updates: Partial<Pick<UserProfile, 'intolerances' | 'severities' | 'conditions' | 'onboardingComplete' | 'displayName'>>
  ): Promise<void> {
    await db.users.update(userId, { ...updates, updatedAt: new Date() });
  },

  async getUser(userId: number): Promise<UserProfile | undefined> {
    return db.users.get(userId);
  }
};
