'use strict';
const { v4: uuidv4 } = require('uuid');

const TAG_TRANSLATIONS = {
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
  lacteos: { es: 'Lácteos', en: 'Dairy' },
  egg: { es: 'Huevo', en: 'Egg' },
  huevo: { es: 'Huevo', en: 'Egg' },
  gluten: { es: 'Gluten', en: 'Gluten' },
  grain: { es: 'Grano', en: 'Grain' },
  peanut: { es: 'Maní', en: 'Peanut' },
  mani: { es: 'Maní', en: 'Peanut' },
  seafood: { es: 'Pescado', en: 'Fish' },
  pescado: { es: 'Pescado', en: 'Fish' },
  sesame: { es: 'Sésamo', en: 'Sesame' },
  sesamo: { es: 'Sésamo', en: 'Sesame' },
  shellfish: { es: 'Mariscos', en: 'Shellfish' },
  mariscos: { es: 'Mariscos', en: 'Shellfish' },
  soy: { es: 'Soja', en: 'Soy' },
  soja: { es: 'Soja', en: 'Soy' },
  sulfite: { es: 'Sulfitos', en: 'Sulfites' },
  sulfitos: { es: 'Sulfitos', en: 'Sulfites' },
  tree_nut: { es: 'Frutos Secos', en: 'Tree Nuts' },
  frutos_secos: { es: 'Frutos Secos', en: 'Tree Nuts' },
  wheat: { es: 'Trigo', en: 'Wheat' },
  trigo: { es: 'Trigo', en: 'Wheat' },
  corn: { es: 'Maíz', en: 'Corn' },
  maiz: { es: 'Maíz', en: 'Corn' },
  sibo: { es: 'SIBO', en: 'SIBO' },
  fodmap: { es: 'FODMAP', en: 'FODMAP' },
  low_fodmap: { es: 'Low FODMAP', en: 'Low FODMAP' },
  fructanos: { es: 'Fructanos', en: 'Fructans' },
  vegano: { es: 'Vegano', en: 'Vegan' },
  vegan: { es: 'Vegano', en: 'Vegan' },
  arroz: { es: 'Arroz', en: 'Rice' },
  queso: { es: 'Queso', en: 'Cheese' },
  albahaca: { es: 'Albahaca', en: 'Basil' },
  pollo: { es: 'Pollo', en: 'Chicken' },
  carne: { es: 'Carne', en: 'Meat' },
  bajo_en_fodmap: { es: 'Bajo en FODMAP', en: 'Low FODMAP' },
  sin_gluten: { es: 'Sin Gluten', en: 'Gluten-free' },
  sin_lacteos: { es: 'Sin Lácteos', en: 'Dairy-free' },
  sibo_safe: { es: 'SIBO Safe', en: 'SIBO Safe' },
  postre: { es: 'Postre', en: 'Dessert' },
  salado: { es: 'Salado', en: 'Savory' },
  limon: { es: 'Limón', en: 'Lemon' },
  limón: { es: 'Limón', en: 'Lemon' },
  amapola: { es: 'Amapola', en: 'Poppy Seed' },
  ñoquis: { es: 'Ñoquis', en: 'Gnocchi' },
  noquis: { es: 'Ñoquis', en: 'Gnocchi' },
  squash: { es: 'Zapallo', en: 'Squash' },
  lentils: { es: 'Lentejas', en: 'Lentils' },
  bolognese: { es: 'Bolognesa', en: 'Bolognese' },
  sin_leche: { es: 'Sin leche', en: 'Dairy-free' },
  frutas: { es: 'Frutas', en: 'Fruit' },
  horno: { es: 'Horno', en: 'Baked' },
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tags', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      key: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      es: {
        type: Sequelize.STRING,
        allowNull: false
      },
      en: {
        type: Sequelize.STRING,
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });

    const seedData = Object.entries(TAG_TRANSLATIONS).map(([key, value]) => ({
      id: uuidv4(),
      key,
      es: value.es,
      en: value.en,
      created_at: new Date(),
      updated_at: new Date()
    }));

    await queryInterface.bulkInsert('tags', seedData);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('tags');
  }
};
