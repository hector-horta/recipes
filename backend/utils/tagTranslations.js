import { TagService } from '../services/TagService.js';

/**
 * Normalizes a single tag using the database-driven translations.
 * @param {string|object} tag 
 * @param {Object} translationMap Map of key -> {es, en}
 */
export function normalizeTag(tag, translationMap = {}) {
  let tagText = '';
  let existingEn = null;

  if (tag && typeof tag === 'object') {
    tagText = tag.es || tag.en || '';
    existingEn = tag.en;
  } else if (typeof tag === 'string') {
    tagText = tag;
  } else {
    tagText = String(tag);
  }

  const key = tagText.toLowerCase().trim().replace(/\s+/g, '_');
  const translation = translationMap[key];

  if (translation) return { es: translation.es, en: translation.en };

  // If no translation found but we already have an object with both es and en, keep it
  if (tag && typeof tag === 'object' && tag.es && tag.en && tag.es !== tag.en) {
    return tag;
  }

  // Fallback
  return { es: tagText, en: existingEn || tagText };
}

/**
 * Normalizes an array of tags fetching translations from TagService.
 * @param {Array} tags 
 */
export async function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  
  // Fetch all tags from DB/Cache once
  const allTags = await TagService.getAllTags();
  const translationMap = allTags.reduce((acc, t) => {
    acc[t.key] = t;
    return acc;
  }, {});

  const seen = new Set();
  const result = [];
  for (const tag of tags) {
    if (!tag || (typeof tag === 'string' && tag.trim() === '')) continue;
    
    const normalized = normalizeTag(tag, translationMap);
    if (!normalized.es || normalized.es.trim() === '') continue;
    
    const id = normalized.es.toLowerCase();
    if (!seen.has(id)) {
      seen.add(id);
      result.push(normalized);
    }
  }
  return result;
}
