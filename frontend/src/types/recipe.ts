export interface Ingredient {
  id: string;
  name: string;
  isBorderlineSafe?: boolean; // Para el warning tooltip de ingredientes al límite
}

export interface Recipe {
  id: string;
  title: string;
  imageUrl: string;
  prepTimeMinutes: number;
  estimatedCost: number; // 1 (barato), 2 (medio), 3 (caro)
  ingredients: Ingredient[];
  instructions: string[];
  summary?: string;
  safetyLevel: 'safe' | 'review' | 'unsafe';
  siboAllergiesTags: string[]; // e.g., "Bajo en FODMAP", "Sin Gluten"
}
