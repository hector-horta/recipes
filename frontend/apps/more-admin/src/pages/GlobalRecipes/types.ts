export interface Tag {
  id: string;
  key: string;
  es: string;
  en: string;
}

export interface Recipe {
  id: string;
  title: string;
  titleEn: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  status?: 'draft' | 'published' | 'archived';
  safetyLevel: 'safe' | 'caution' | 'avoid';
  ingredients: any[];
  instructions: string[];
  tags: string[];
  imageUrl: string;
  imageFilename?: string;
  createdAt?: string;
}

export interface RecipeFormData {
  title: string;
  titleEn: string;
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  status?: 'draft' | 'published' | 'archived';
  safetyLevel: 'safe' | 'caution' | 'avoid';
  ingredients: any[];
  instructions: string[];
  tags: string[];
  imageUrl: string;
}
