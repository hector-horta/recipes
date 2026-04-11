// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

dotenv.config({ path: '../.env' });
dotenv.config(); // Fallback to local .env if exists

const app = express();
const port = process.env.PORT || 5001;

// Enable CORS for frontend origins (localhost + local network)
const corsOptions = {
  origin: function (origin, callback) {
    // Allow localhost, local network IPs, and undefined (mobile apps, direct requests)
    const allowedHosts = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost',
      'http://127.0.0.1:5173'
    ];
    
    // Allow local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const isLocalhost = !origin || allowedHosts.includes(origin);
    const isLocalNetwork = origin && (
      /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
      /^https?:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin) ||
      /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(origin)
    );
    
    if (isLocalhost || isLocalNetwork) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200
};

import authRoutes from './routes/auth.js';
import favoritesRoutes from './routes/favorites.js';
import ingestRoutes from './routes/ingest.js';
import adminRoutes from './routes/admin.js';
import suggestionRoutes from './routes/suggestions.js';
import { connectDB, sequelize } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { ActivityLogger } from './services/ActivityLogger.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(helmet());

// Nginx actúa como reverse proxy: Express debe confiar en X-Forwarded-For
// para que el rate limiting vea la IP real del cliente, no la IP interna de Nginx.
app.set('trust proxy', 1);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window`
  standardHeaders: true, 
  legacyHeaders: false, 
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' }
});

const recipeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  limit: 100, // 100 recipe searches per IP per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Se han agotado las búsquedas permitidas por este dispositivo durante 15 minutos.' }
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

// Data previously hardcoded in frontend

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

import { RecipeProvider } from './services/RecipeProvider.js';
import { optionalAuthenticateToken } from './middleware/auth.js';
import { Profile } from './models/Profile.js';

app.get('/api/recipes', optionalAuthenticateToken, recipeLimiter, async (req, res, next) => {
  try {
    let userProfile = null;
    if (req.user) {
      userProfile = await Profile.findOne({ where: { user_id: req.user.id } });
      if (userProfile) {
         console.log(`[DEBUG-PROFILE] User: ${req.user.id}, Intolerances: ${JSON.stringify(userProfile.intolerances)}, Severities: ${JSON.stringify(userProfile.severities)}`);
      } else {
         console.log(`[DEBUG-PROFILE] No profile found for ${req.user.id}`);
      }
    }

    const { query, number } = req.query;
    const data = await RecipeProvider.getRecipes(req.query, userProfile);

    // ── Telemetría de búsquedas ───────────────────────────────────────────
    const searchTerms = query?.trim() || '';
    const isEmpty = !data || data.length === 0;

    if (searchTerms.length >= 3) {
      ActivityLogger.log('SEARCH', { query: searchTerms }, {
        userId: req.user?.id || null,
        ip: req.ip,
        failedSearch: isEmpty
      });
    }

    // ── Telemetría de filtrado por intolerancias ──────────────────────────
    const userIntolerances = userProfile?.intolerances || [];
    if (userIntolerances.length > 0) {
      ActivityLogger.log('SEARCH', {
        query: query || '(browse)',
        filteredByIntolerances: userIntolerances,
        resultsAfterFilter: data.length
      }, {
        userId: req.user?.id || null,
        ip: req.ip,
        failedSearch: false
      });
    }
    // ─────────────────────────────────────────────────────────────────────

    res.json(data);
  } catch (error) {
    next(error);
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error Guard]', err.message);

  const status = err.status || 500;
  let message = 'Vaya, ocurrió un problema inesperado. Inténtalo más tarde.';

  if (status === 402) {
    message = 'Se ha agotado la cuota de la API externa para hoy. Por favor, vuelve mañana.';
  } else if (status === 504) {
    message = 'La búsqueda tardó más de lo esperado en responder. Inténtalo de nuevo.';
  } else if (status === 400 && err.error === 'Petición malformada.') {
    return res.status(status).json(err);
  }

  // ── Alertas Telegram para errores graves ─────────────────────────────────
  const isNvidiaError = err.message?.includes('NVIDIA') || err.message?.includes('SDXL');
  const isGroqError   = err.message?.includes('GROQ') || err.message?.includes('Whisper') || err.message?.includes('Groq');
  const isFatal       = status >= 500;

  if (isNvidiaError || isGroqError || isFatal) {
    const service  = isNvidiaError ? 'NVIDIA API' : isGroqError ? 'Groq API' : 'Backend';
    const shortMsg = (err.message || 'Unknown error').slice(0, 200);
    const fullUrl  = req.originalUrl || req.url;
    
    ActivityLogger.alertAsync(
      `🔴 *[ERROR ${status}] ${service}*\n\n` +
      `\`${shortMsg}\`\n\n` +
      `📍 ${req.method} ${fullUrl}`
    );
  }
  // ─────────────────────────────────────────────────────────────────────────

  res.status(status).json({ error: message });
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
