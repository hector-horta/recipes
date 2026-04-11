export interface Tag {
  es: string;
  en: string;
}

export interface Ingredient {
  id: string;
  name: string;
  nameEn?: string;
  quantity?: string;
  unit?: string;
  unitEn?: string;
  isBorderlineSafe?: boolean;
}


export interface Recipe {
  id: string;
  title: string;
  titleEn?: string;
  imageUrl: string;
  prepTimeMinutes: number;
  estimatedCost: number;
  ingredients: Ingredient[];
  instructions: string[];
  instructionsEn?: string[];
  summary?: string;
  safetyLevel: 'safe' | 'review' | 'unsafe';
  siboAllergiesTags: (Tag | string)[];
}

export interface RecipeSearchResponse {
  recipes: Recipe[];
  filteredUnsafeCount: number;
  filteredAllergens: string[];
}
