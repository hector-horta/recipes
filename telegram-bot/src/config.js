import dotenv from 'dotenv';
dotenv.config();

export const config = {
  TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  ALLOWED_USER_ID: process.env.TELEGRAM_USER_ID,
  BACKEND_URL: process.env.BACKEND_URL || 'http://backend:5001',
  NODE_ENV: process.env.NODE_ENV || 'development',
  // API Key for Backend -> Bot communication? Or Bot -> Backend?
  // Let's use a simple Bot API Key for now if we want to secure the ingest endpoints
  EXTERNAL_API_KEY: process.env.EXTERNAL_API_KEY
};

export const validateConfig = () => {
  if (!config.TOKEN) {
    throw new Error('TELEGRAM_BOT_TOKEN is missing in environment variables');
  }
  if (!config.ALLOWED_USER_ID) {
    throw new Error('TELEGRAM_USER_ID is missing in environment variables');
  }
};
