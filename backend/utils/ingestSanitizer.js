/**
 * ingestSanitizer.js
 * 
 * Este módulo asegura que los datos estructurados por el LLM coincidan 
 * exactamente con los ENUMs y tipos de la base de datos (PostgreSQL/Sequelize),
 * preservando los cálculos de la IA pero mapeándolos a valores válidos.
 */

const VALID_DIFFICULTY = ['easy', 'medium', 'hard'];
const VALID_SIBO_RISK = ['safe', 'caution', 'avoid'];

import { normalizeTags } from './tagTranslations.js';

const DIFFICULTY_MAP = {
  'fácil': 'easy', 'facil': 'easy', 'simple': 'easy',
  'normal': 'medium', 'media': 'medium', 'moderada': 'medium', 'intermedia': 'medium',
  'difícil': 'hard', 'dificil': 'hard', 'compleja': 'hard', 'alta': 'hard'
};

const SIBO_RISK_MAP = {
  'seguro': 'safe', 'bajo': 'safe', 'verde': 'safe',
  'precaución': 'caution', 'precaucion': 'caution', 'moderado': 'caution', 'amarillo': 'caution',
  'evitar': 'avoid', 'alto': 'avoid', 'rojo': 'avoid', 'peligro': 'avoid'
};

export async function sanitizeStructuredRecipe(structured) {
  const result = { ...structured };

  // 1. Validar Título (Obligatorio en DB)
  if (!result.title) result.title = {};
  if (!result.title.es) result.title.es = 'Receta sin título';
  if (!result.title.en) result.title.en = result.title.es;

  // 2. Normalizar Dificultad (ENUM)
  let diff = (result.difficulty || 'medium').toLowerCase().trim();
  if (!VALID_DIFFICULTY.includes(diff)) {
    result.difficulty = DIFFICULTY_MAP[diff] || 'medium';
  } else {
    result.difficulty = diff;
  }

  // 3. Normalizar Riesgo SIBO (ENUM)
  let risk = (result.siboRiskLevel || 'safe').toLowerCase().trim();
  if (!VALID_SIBO_RISK.includes(risk)) {
    result.siboRiskLevel = SIBO_RISK_MAP[risk] || 'safe';
  } else {
    result.siboRiskLevel = risk;
  }

  // 4. Asegurar tipos numéricos para tiempos (INTEGER en DB)
  // Si el LLM devuelve un string "15 min", extraemos solo el número.
  // También revisamos si el LLM devolvió snake_case por error.
  const parseNum = (val, def = 0) => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const match = val.match(/\d+/);
      return match ? parseInt(match[0], 10) : def;
    }
    return def;
  };

  // Soporte para snake_case si el LLM se equivoca
  const prepVal = result.prepTimeMinutes !== undefined ? result.prepTimeMinutes : result.prep_time_minutes;
  const cookVal = result.cookTimeMinutes !== undefined ? result.cookTimeMinutes : result.cook_time_minutes;

  result.prepTimeMinutes = parseNum(prepVal, 0);
  result.cookTimeMinutes = parseNum(cookVal, 0);
  result.servings = parseNum(result.servings, 1);

  // Fallback: Si los tiempos son 0 pero hay steps con duración, intentamos inferir
  if (result.prepTimeMinutes === 0 && result.cookTimeMinutes === 0 && Array.isArray(result.steps)) {
    let inferredPrep = 0;
    let inferredCook = 0;

    const cookKeywords = ['bake', 'cook', 'fry', 'oven', 'boil', 'roast', 'hornear', 'cocinar', 'freír', 'hervir', 'asar', 'fuego', 'horno'];
    
    result.steps.forEach(step => {
      const duration = parseNum(step.durationMinutes, 0);
      const instruction = (step.instruction?.en || step.instruction?.es || '').toLowerCase();
      
      const isCookStep = cookKeywords.some(kw => instruction.includes(kw));

      if (isCookStep) {
        inferredCook += duration;
      } else {
        inferredPrep += duration;
      }
    });

    if (inferredPrep > 0) result.prepTimeMinutes = inferredPrep;
    if (inferredCook > 0) result.cookTimeMinutes = inferredCook;
  }

  // 5. Asegurar Arreglos
  result.ingredients = Array.isArray(result.ingredients) ? result.ingredients : [];
  result.steps = Array.isArray(result.steps) ? result.steps : [];
  result.tags = await normalizeTags(Array.isArray(result.tags) ? result.tags : []);
  result.siboAlerts = Array.isArray(result.siboAlerts) ? result.siboAlerts : [];

  return result;
}

