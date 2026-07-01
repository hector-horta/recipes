import { Op, where, cast, col } from 'sequelize';
import { TagService } from '../services/TagService.js';
import { ALL_CANONICAL_TAGS, CANONICAL_CATEGORIES, DIETARY_HIGHLIGHTS } from '../constants/tags.js';

/**
 * Expands a search query into multiple search terms based on canonical tags
 * and returns the Sequelize conditions array.
 * 
 * @param {string} query Search query string
 * @returns {object[]} Sequelize OR conditions
 */
export function expandSearchTerms(query) {
  const q = query;
  const baseQ = q.toLowerCase().endsWith('es') ? q.slice(0, -2) : (q.toLowerCase().endsWith('s') ? q.slice(0, -1) : q);
  
  const searchTerms = [q];
  if (baseQ !== q && baseQ.length > 2) searchTerms.push(baseQ);

  const queryLower = q.toLowerCase();
  const expandedTerms = new Set(searchTerms);

  ALL_CANONICAL_TAGS.forEach(tag => {
    const matchesEs = tag.es.toLowerCase().includes(queryLower);
    const matchesEn = tag.en.toLowerCase().includes(queryLower);
    const matchesKey = tag.key.toLowerCase().includes(queryLower);
    const matchesKeyword = tag.keywords?.some(k => k.toLowerCase().includes(queryLower));
    
    if (matchesEs || matchesEn || matchesKey || matchesKeyword) {
      expandedTerms.add(tag.key);
      if (tag.keywords) {
        tag.keywords.forEach(k => expandedTerms.add(k));
      }
    }
  });

  const orConditions = [];
  Array.from(expandedTerms).forEach(term => {
    orConditions.push({ title_es: { [Op.iLike]: `%${term}%` } });
    orConditions.push({ title_en: { [Op.iLike]: `%${term}%` } });
    orConditions.push(where(cast(col('tags'), 'text'), { [Op.iLike]: `%${term}%` }));
    orConditions.push({ '$recipeIngredients.name_es$': { [Op.iLike]: `%${term}%` } });
    orConditions.push({ '$recipeIngredients.name_en$': { [Op.iLike]: `%${term}%` } });
  });

  return orConditions;
}

/**
 * Normalizes, translates, and filters tags for a recipe.
 * Applies auto-categorization heuristics.
 * 
 * @param {object} recipe Recipe data
 * @param {object[]} ingredients Normalized ingredients array
 * @param {object} tagMap Maps tag keys to translations
 * @returns {object[]} Processed tag array
 */
export function processRecipeTags(recipe, ingredients, tagMap) {
  const rawTags = recipe.tags || [];
  const processedTags = rawTags.map(t => {
    const isString = typeof t === 'string';
    const tagObj = isString ? { es: t, en: t } : t;
    const key = TagService.normalizeKey(tagObj.key || tagObj.es || '');
    
    if (tagMap[key]) {
      return { es: tagMap[key].es, en: tagMap[key].en, key };
    }
    
    return { 
      es: tagObj.es || '', 
      en: tagObj.en || tagObj.es || '',
      key
    };
  });

  // 1. Filter allowed tags (Categories + Dietary)
  const allowedKeys = [...CANONICAL_CATEGORIES, ...DIETARY_HIGHLIGHTS].map(c => c.key);
  let finalTags = processedTags.filter(t => allowedKeys.includes(t.key));

  // Special mapping: SIBO/Fodmap related tags -> Low FODMAP
  const legacyFodmapKeys = ['sibo', 'fodmap', 'sibo_safe', 'bajo_en_fodmap'];
  if (processedTags.some(t => legacyFodmapKeys.includes(t.key))) {
    const lowFodmapTag = DIETARY_HIGHLIGHTS.find(d => d.key === 'low_fodmap');
    if (!finalTags.some(t => t.key === 'low_fodmap')) {
      finalTags.push({ es: lowFodmapTag.es, en: lowFodmapTag.en, key: lowFodmapTag.key });
    }
  }

  // 2. Auto-Categorization (Heuristic)
  if (!finalTags.some(t => CANONICAL_CATEGORIES.map(c => c.key).includes(t.key))) {
    const searchText = ` ${recipe.title_es || ''} ${recipe.title_en || ''} ${ingredients.map(i => i.name).join(' ')} `.toLowerCase();
    
    const detectedCategories = CANONICAL_CATEGORIES.filter(cat => 
      cat.keywords.some(k => {
        const regex = new RegExp(`\\b${k}\\b`, 'i');
        return regex.test(searchText);
      })
    );

    detectedCategories.forEach(cat => {
      if (!finalTags.some(t => t.key === cat.key)) {
        finalTags.push({ es: cat.es, en: cat.en, key: cat.key });
      }
    });
  }

  return finalTags.map(({ key, ...rest }) => rest);
}
