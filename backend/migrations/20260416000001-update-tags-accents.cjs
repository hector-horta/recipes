'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Robust normalization helper
 */
function normalizeKey(text) {
  if (!text) return '';
  let normalized = text.toString().trim().toLowerCase();
  
  // Manual replacement map for robustness
  const map = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'ñ': 'n', 'ü': 'u',
    'Á': 'a', 'É': 'e', 'Í': 'i', 'Ó': 'o', 'Ú': 'u',
    'Ñ': 'n', 'Ü': 'u'
  };
  
  Object.keys(map).forEach(char => {
    normalized = normalized.split(char).join(map[char]);
  });

  return normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-h0-9_]/g, ''); // Ensure only clean chars
}

/**
 * Remove accents from a string for display
 */
function removeAccents(text) {
  if (!text) return '';
  let normalized = text.toString();
  const map = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'ñ': 'n', 'ü': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
    'Ñ': 'N', 'Ü': 'U'
  };
  Object.keys(map).forEach(char => {
    normalized = normalized.split(char).join(map[char]);
  });
  return normalized.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const NEW_TAGS = {
  favorite: { es: 'Favorito', en: 'Favorite' },
  favorito: { es: 'Favorito', en: 'Favorite' },
  rice: { es: 'Arroz', en: 'Rice' },
  cheese: { es: 'Queso', en: 'Cheese' },
  vegetarian: { es: 'Vegetariano', en: 'Vegetarian' },
  vegan: { es: 'Vegano', en: 'Vegan' },
  healthy: { es: 'Saludable', en: 'Healthy' },
  savory: { es: 'Salado', en: 'Savory' },
  postre: { es: 'Postre', en: 'Dessert' },
  limon: { es: 'Limon', en: 'Lemon' },
  limón: { es: 'Limon', en: 'Lemon' },
  noquis: { es: 'Noquis', en: 'Gnocchi' },
  ñoquis: { es: 'Noquis', en: 'Gnocchi' }
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Fetch all existing tags
    const [existingTags] = await queryInterface.sequelize.query('SELECT * FROM tags');
    
    // 2. Clear table
    await queryInterface.bulkDelete('tags', null, {});
    
    const tagMap = new Map();
    
    // Process existing tags first to preserve what we have
    existingTags.forEach(t => {
      const key = normalizeKey(t.key);
      if (key && !tagMap.has(key)) {
        tagMap.set(key, {
          es: removeAccents(t.es),
          en: removeAccents(t.en)
        });
      }
    });
    
    // Overlay/Add NEW_TAGS
    Object.entries(NEW_TAGS).forEach(([rawKey, value]) => {
      const key = normalizeKey(rawKey);
      if (key) {
        tagMap.set(key, {
          es: removeAccents(value.es),
          en: removeAccents(value.en)
        });
      }
    });
    
    const seedData = Array.from(tagMap.entries()).map(([key, value]) => ({
      id: uuidv4(),
      key,
      es: value.es,
      en: value.en,
      created_at: new Date(),
      updated_at: new Date()
    }));
    
    if (seedData.length > 0) {
      await queryInterface.bulkInsert('tags', seedData);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('tags', null, {});
  }
};
