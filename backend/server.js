import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

import { config } from './config/env.js';

const app = express();
const port = config.PORT;

// Enable CORS for frontend origins (localhost + local network)
import { corsOptions } from './config/cors.js';
import authRoutes from './routes/auth.js';
import favoritesRoutes from './routes/favorites.js';
import ingestRoutes from './routes/ingest.js';
import adminRoutes from './routes/admin.js';
import suggestionRoutes from './routes/suggestions.js';
import recipeRoutes from './routes/recipes.js';
import { connectDB, sequelize } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { ActivityLogger } from './services/ActivityLogger.js';

import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import yamljs from 'yamljs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(helmet());
app.use(cookieParser());

// Nginx actúa como reverse proxy: Express debe confiar en X-Forwarded-For
app.set('trust proxy', 1);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 100,
  standardHeaders: true, 
  legacyHeaders: false, 
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

app.use('/api/', globalLimiter);
app.use(cors(corsOptions));
app.use(express.json());

app.use('/public/recipes', express.static(path.join(__dirname, 'public', 'recipes')));

// Initialize external services
await connectDB();
await sequelize.sync();
connectRedis();

app.use('/api/auth', authRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/ingest', ingestRoutes);
app.use('/admin', adminRoutes);
app.use('/api/suggestions', suggestionRoutes);
app.use('/api/recipes', recipeRoutes);

// Swagger API Documentation
const swaggerDocument = yamljs.load(path.join(__dirname, 'swagger.yaml'));
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

import { MEDICAL_TRIGGERS, INTOLERANCE_CATALOG } from './config/medical.js';

// Healthcheck / Status endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is running!', version: '1.0.0' });
});

// Dynamic Data Endpoints
app.get('/api/medical/catalog', (req, res) => {
  res.json(INTOLERANCE_CATALOG);
});

app.get('/api/medical/triggers', (req, res) => {
  res.json(MEDICAL_TRIGGERS);
});

import { errorHandler } from './middleware/errorHandler.js';

// Global Error Handler
app.use(errorHandler);

process.on('unhandledRejection', (reason) => {
  ActivityLogger.error('Unhandled Rejection', reason);
});

process.on('uncaughtException', (error) => {
  ActivityLogger.error('Uncaught Exception', error);
  // Give some time to log before exiting
  setTimeout(() => process.exit(1), 1000);
});

app.listen(port, () => {
  ActivityLogger.info(`Backend server listening at http://localhost:${port}`);
});
