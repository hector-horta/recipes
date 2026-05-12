import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';
import { User } from './User.js';
import { Organization } from './Organization.js';

export const FavoriteRecipe = sequelize.define('FavoriteRecipe', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: false
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'organizations',
      key: 'id'
    }
  },
  recipe_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'favorite_recipes',
  timestamps: true,
  underscored: true
});

// Associations
User.hasMany(FavoriteRecipe, { foreignKey: 'user_id', as: 'favorites' });
FavoriteRecipe.belongsTo(User, { foreignKey: 'user_id' });
FavoriteRecipe.belongsTo(Organization, { foreignKey: 'organization_id', as: 'organization' });
Organization.hasMany(FavoriteRecipe, { foreignKey: 'organization_id', as: 'favorite_recipes' });

// Lazy association to Recipe (avoids circular imports)
let _recipeAssociationDefined = false;
export function associateWithRecipe(Recipe) {
  if (_recipeAssociationDefined) return;
  FavoriteRecipe.belongsTo(Recipe, { foreignKey: 'recipe_id', as: 'recipe', constraints: false });
  _recipeAssociationDefined = true;
}
