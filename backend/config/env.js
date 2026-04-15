import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  MAGIC_LINK_SECRET: z.string().min(1, 'MAGIC_LINK_SECRET is required'),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // External APIs
  API_KEY: z.string().optional(),
  SPOONACULAR_API_KEY: z.string().optional(),
  NVIDIA_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  
  // Telegram Integration
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  TELEGRAM_USER_ID: z.string().optional(),

  // Admin
  ADMIN_API_KEY: z.string().optional(),

  // HCP Vault Secrets
  HCP_CLIENT_ID: z.string().optional(),
  HCP_CLIENT_SECRET: z.string().optional(),
  HCP_PROJECT_ID: z.string().optional(),

  // Postgres discrete settings (if DATABASE_URL is not used alone)
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_USER: z.string().default('wati_user'),
  POSTGRES_HOST: z.string().optional(),
  POSTGRES_DB: z.string().default('wati_db'),

  // Analytics
  UMAMI_URL: z.string().default('http://analytics.localhost'),
  UMAMI_WEBSITE_ID: z.string().optional()
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Invalid environment variables:\n', _env.error.format());
  process.exit(1);
}

export const config = _env.data;
