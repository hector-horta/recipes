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
  // slug not returned by API
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  // servings not returned by API
  // difficulty not returned by API
  // status not returned by API
  safetyLevel: 'safe' | 'review' | 'unsafe';
  ingredients: any[];
  instructions: string[];
  tags: string[];
  imageUrl: string;
  // image_filename not returned by API
  // created_at not returned by API
}

export interface RecipeFormData {
  title: string;
  titleEn: string;
  // slug not returned by API
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  servings?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  status?: 'draft' | 'published' | 'archived';
  safetyLevel: 'safe' | 'review' | 'unsafe';
  ingredients: any[];
  instructions: string[];
  tags: string[];
  imageUrl: string;
}
