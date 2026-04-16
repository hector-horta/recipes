/**
 * Canonical tag definitions and keywords for heuristic classification.
 */

export const CANONICAL_CATEGORIES = [
  { 
    key: 'bebestible', 
    es: 'Bebestible', 
    en: 'Drink', 
    keywords: ['jugo', 'batido', 'te', 'cafe', 'bebida', 'chocolate caliente', 'infusion', 'smoothie', 'juice', 'drink', 'tea', 'coffee'] 
  },
  { 
    key: 'postre', 
    es: 'Postre', 
    en: 'Dessert', 
    keywords: ['postre', 'dulce', 'torta', 'galleta', 'helado', 'pudin', 'mousse', 'dessert', 'sweet', 'cake', 'cookie', 'ice cream'] 
  },
  { 
    key: 'entrada', 
    es: 'Entrada', 
    en: 'Starter Dish', 
    keywords: ['entrada', 'sopa', 'ensalada', 'aperitivo', 'starter', 'soup', 'salad', 'appetizer'] 
  },
  { 
    key: 'plato_principal', 
    es: 'Plato Principal', 
    en: 'Main Course', 
    keywords: ['plato principal', 'fondo', 'almuerzo', 'cena', 'guiso', 'estofado', 'main course', 'dinner', 'lunch', 'stew'] 
  },
  { 
    key: 'snack', 
    es: 'Snack', 
    en: 'Snack', 
    keywords: ['snack', 'picoteo', 'tentempie', 'frutos secos', 'chips', 'snack'] 
  },
  { 
    key: 'aderezo_salsa', 
    es: 'Aderezo/Salsa', 
    en: 'Dressing/Salsa', 
    keywords: ['salsa', 'aderezo', 'dip', 'aliño', 'vinagreta', 'dressing', 'vinaigrette', 'sauce', 'mayonnaise', 'mayonesa', 'pesto', 'hummus'] 
  }
];

export const DIETARY_HIGHLIGHTS = [
  { key: 'vegano', es: 'Vegano', en: 'Vegan' },
  { key: 'sin_gluten', es: 'Sin Gluten', en: 'Gluten-free' },
  { key: 'low_fodmap', es: 'Bajo en FODMAP', en: 'Low FODMAP' }
];

export const ALL_CANONICAL_TAGS = [...CANONICAL_CATEGORIES, ...DIETARY_HIGHLIGHTS];
