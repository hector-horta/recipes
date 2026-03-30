/**
 * Database Configuration
 * 
 * This module configures the Sequelize ORM for PostgreSQL connection.
 * 
 * Credentials Management:
 * - For development: Uses POSTGRES_PASSWORD from .env file
 * - For production: Uses POSTGRES_PASSWORD from environment variables
 * 
 * Optional HCP Vault Integration:
 * - When HCP_CLIENT_ID, HCP_CLIENT_SECRET, and HCP_PROJECT_ID are set,
 *   the backend can retrieve secrets from HCP Vault Secrets
 * - See vault.js for the vault client implementation
 * 
 * Environment Variables Required:
 * - POSTGRES_PASSWORD: Database password (required)
 * - POSTGRES_USER: Database user (default: wati_user)
 * - POSTGRES_HOST: Database host (default: localhost or postgres in Docker)
 * - POSTGRES_DB: Database name (default: wati_db)
 * - DATABASE_URL: Full connection string (alternative to individual params)
 */

import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });
dotenv.config();

/**
 * Determines if running in production mode
 * Used to select appropriate database host
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * Gets the database host based on environment
 * - Production (Docker): uses 'postgres' service name
 * - Development: uses 'localhost'
 * 
 * @returns {string} Database hostname
 */
function getDbHost() {
  if (process.env.POSTGRES_HOST) {
    return process.env.POSTGRES_HOST;
  }
  return isProduction ? 'postgres' : 'localhost';
}

/**
 * Builds the PostgreSQL connection string from environment variables
 * 
 * Priority:
 * 1. DATABASE_URL (full connection string)
 * 2. Individual parameters (POSTGRES_USER, POSTGRES_PASSWORD, etc.)
 * 
 * @returns {string} PostgreSQL connection string
 * @throws {Error} If POSTGRES_PASSWORD is not set
 */
function getConnectionString() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const password = process.env.POSTGRES_PASSWORD;

  if (!password) {
    throw new Error('[Database] No password available. Set POSTGRES_PASSWORD environment variable.');
  }

  const dbUser = process.env.POSTGRES_USER || 'wati_user';
  const dbHost = getDbHost();
  const dbName = process.env.POSTGRES_DB || 'wati_db';
  
  return `postgres://${dbUser}:${password}@${dbHost}:5432/${dbName}`;
}

const connectionString = getConnectionString();

export const sequelize = new Sequelize(connectionString, {
  dialect: 'postgres',
  logging: console.log,
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
