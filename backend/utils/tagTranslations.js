export const TAG_TRANSLATIONS = {
  avena: { es: 'Avena', en: 'Oat' },
  bebida: { es: 'Bebida', en: 'Drink' },
  crema: { es: 'Crema', en: 'Cream' },
  desayuno: { es: 'Desayuno', en: 'Breakfast' },
  empanadas: { es: 'Empanadas', en: 'Empanadas' },
  espinacas: { es: 'Espinacas', en: 'Spinach' },
  frío: { es: 'Frío', en: 'Cold' },
  frio: { es: 'Frío', en: 'Cold' },
  integral: { es: 'Integral', en: 'Whole Grain' },
  mayonesa: { es: 'Mayonesa', en: 'Mayonnaise' },
  orégano: { es: 'Orégano', en: 'Oregano' },
  oregano: { es: 'Orégano', en: 'Oregano' },
  pan: { es: 'Pan', en: 'Bread' },
  papa: { es: 'Papa', en: 'Potato' },
  pita: { es: 'Pita', en: 'Pita' },
  saludable: { es: 'Saludable', en: 'Healthy' },
  vegetal: { es: 'Vegetal', en: 'Vegetable' },
  vegetales: { es: 'Vegetales', en: 'Vegetables' },
  vegetariano: { es: 'Vegetariano', en: 'Vegetarian' },
  zanahoria: { es: 'Zanahoria', en: 'Carrot' },
  dairy: { es: 'Lácteos', en: 'Dairy' },
  egg: { es: 'Huevo', en: 'Egg' },
  gluten: { es: 'Gluten', en: 'Gluten' },
  grain: { es: 'Grano', en: 'Grain' },
  peanut: { es: 'Maní', en: 'Peanut' },
  seafood: { es: 'Pescado', en: 'Fish' },
  sesame: { es: 'Sésamo', en: 'Sesame' },
  shellfish: { es: 'Mariscos', en: 'Shellfish' },
  soy: { es: 'Soja', en: 'Soy' },
  sulfite: { es: 'Sulfitos', en: 'Sulfites' },
  tree_nut: { es: 'Frutos Secos', en: 'Tree Nuts' },
  wheat: { es: 'Trigo', en: 'Wheat' },
  corn: { es: 'Maíz', en: 'Corn' },
  sibo: { es: 'SIBO', en: 'SIBO' },
};

export function normalizeTag(tag) {
  const key = tag.toLowerCase().replace(/\s+/g, '_');
  return TAG_TRANSLATIONS[key] || { es: tag, en: tag };
}

export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const result = [];
  for (const tag of tags) {
    if (!tag || (typeof tag === 'string' && tag.trim() === '')) continue;
    const normalized = normalizeTag(tag);
    if (!normalized.es || normalized.es.trim() === '') continue;
    const id = normalized.es.toLowerCase();
    if (!seen.has(id)) {
      seen.add(id);
      result.push(normalized);
    }
  }
  return result;
}
