import { createClient } from 'redis';
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '../.env');
dotenv.config({ path: envPath });
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379';

export const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => console.log('[Redis] Client Error:', err.message));
redisClient.on('connect', () => console.log('[Redis] Connected safely.'));

export const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('[Redis] Connection failed:', error.message);
    }
};
