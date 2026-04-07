import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const SearchLog = sequelize.define('SearchLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  term: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('failed', 'suggested'),
    defaultValue: 'failed'
  },
  conversion: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'search_logs',
  underscored: true,
  timestamps: false
});
