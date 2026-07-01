import { MEDICAL_TRIGGERS } from '../config/medical.js';

// Helper to normalize text (remove accents and lowercase)
export const normalize = (text) => 
  (text || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Global cache for compiled trigger regexes
const triggerRegexCache = new Map();

export function getTriggerRegex(triggerText) {
  if (!triggerRegexCache.has(triggerText)) {
    const normalizedTrigger = normalize(triggerText);
    const escapedTrigger = normalizedTrigger.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    const regex = new RegExp(`(?:^|\\s)${escapedTrigger}(?:s|es)?(?:\\s|$|[.,;])`, 'i');
    triggerRegexCache.set(triggerText, regex);
  }
  return triggerRegexCache.get(triggerText);
}

/**
 * Evaluates the safety of a recipe against a user's intolerances/profile.
 * Marks ingredients as isBorderlineSafe and determines the overall safetyLevel.
 * 
 * @param {object} recipe Recipe data
 * @param {object} userProfile User profile with intolerances, severities, etc.
 * @returns {object} { safetyLevel, ingredients, matchedAllergenIds }
 */
export function evaluateSafety(recipe, userProfile) {
  const profile = userProfile || {};
  const userIntolerances = profile.intolerances || [];
  const userSeverities = profile.severities || {};
  const hasSibo = userIntolerances.some(i => i.toLowerCase() === 'sibo');

  let safetyLevel = 'safe';

  // A) SIBO curation evaluation
  let siboCurated = false;
  if (hasSibo) {
    if (recipe.sibo_risk_level === 'avoid') {
      safetyLevel = 'unsafe';
      siboCurated = true;
    } else if (recipe.sibo_risk_level === 'caution') {
      safetyLevel = 'review';
      siboCurated = true;
    }
  }

  // B) Medical triggers active list
  const activeTriggers = [];
  userIntolerances.forEach(intolerance => {
    const lowerIntolerance = (intolerance || '').toLowerCase();
    const baseId = lowerIntolerance.split('_')[0].split('-')[0];
    
    // Skip SIBO triggers if already handled by curation fields
    if (baseId === 'sibo' && siboCurated) return;
    
    const triggers = MEDICAL_TRIGGERS[baseId];
    if (triggers) {
      triggers.forEach(t => activeTriggers.push({ text: t, baseId }));
    }
  });

  let foundMaxSeverity = null; // 'low' or 'high'
  const matchedAllergenIds = new Set();

  const triggerRegexes = activeTriggers.map(trigger => {
    return { trigger, regex: getTriggerRegex(trigger.text) };
  });

  const ingredients = (recipe.ingredients || []).map(i => {
    let isBorderlineSafe = false;
    const ingNameEs = i.name?.es || i.name || 'Desconocido';
    const normalizedIngName = normalize(ingNameEs);
    
    if (hasSibo && (i.siboAlert || i.isBorderlineSafe)) {
      isBorderlineSafe = true;
    }
    
    triggerRegexes.forEach(({ trigger, regex }) => {
      if (regex.test(normalizedIngName)) {
        const severity = (userSeverities[trigger.baseId] || 'severe').toLowerCase();
        const isHighSeverity = severity === 'severe' || severity === 'anaphylactic';
        
        matchedAllergenIds.add(trigger.baseId);
        isBorderlineSafe = true;

        if (isHighSeverity) {
          foundMaxSeverity = 'high';
        } else if (foundMaxSeverity !== 'high') {
          foundMaxSeverity = 'low';
        }
      }
    });
    
    return {
      id: i.name?.es || i.name || 'unknown',
      name: ingNameEs,
      nameEn: i.name?.en || '',
      quantity: i.quantity || '',
      unit: typeof i.unit === 'object' ? (i.unit?.es || '') : (i.unit || ''),
      unitEn: typeof i.unit === 'object' ? (i.unit?.en || '') : '',
      isBorderlineSafe
    };
  });

  if (foundMaxSeverity === 'high') {
    safetyLevel = 'unsafe';
  } else if (foundMaxSeverity === 'low') {
    safetyLevel = 'review';
  }

  return {
    safetyLevel,
    ingredients,
    matchedAllergenIds: [...matchedAllergenIds]
  };
}
