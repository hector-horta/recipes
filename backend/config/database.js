import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://wati_user:wati_password@postgres:5432/wati_db';

export const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: console.log, // Enabled to debug SQL errors
  define: {
    timestamps: true,
    underscored: true
  }
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('[Sequelize] Connection has been established successfully via Migrations.');
  } catch (error) {
    console.error('[Sequelize] Unable to connect to the database:', error);
  }
};
