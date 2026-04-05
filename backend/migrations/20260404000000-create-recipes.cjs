'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('recipes', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        allowNull: false
      },
      title_es: {
        type: Sequelize.STRING,
        allowNull: false
      },
      title_en: {
        type: Sequelize.STRING,
        allowNull: false
      },
      slug: {
        type: Sequelize.STRING,
        unique: true
      },
      prep_time_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      cook_time_minutes: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      servings: {
        type: Sequelize.INTEGER,
        defaultValue: 1
      },
      difficulty: {
        type: Sequelize.ENUM('easy', 'medium', 'hard'),
        defaultValue: 'medium'
      },
      ingredients: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      steps: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      tags: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      image_url: {
        type: Sequelize.STRING,
        allowNull: true
      },
      image_filename: {
        type: Sequelize.STRING,
        allowNull: true
      },
      sibo_risk_level: {
        type: Sequelize.ENUM('safe', 'caution', 'avoid'),
        defaultValue: 'safe'
      },
      sibo_alerts: {
        type: Sequelize.JSONB,
        defaultValue: []
      },
      source_type: {
        type: Sequelize.ENUM('manual', 'ocr_image', 'audio', 'telegram'),
        defaultValue: 'manual'
      },
      source_reference: {
        type: Sequelize.STRING,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('draft', 'published', 'archived'),
        defaultValue: 'draft'
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    await queryInterface.addIndex('recipes', ['slug']);
    await queryInterface.addIndex('recipes', ['sibo_risk_level']);
    await queryInterface.addIndex('recipes', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('recipes');
  }
};
