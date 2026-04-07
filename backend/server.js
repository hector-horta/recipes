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

// Enable CORS for frontend origins
const corsOptions = {
  origin: function (origin, callback) {
    const allowed = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost',
      'http://192.168.0.187:5173',
      'http://172.18.0.5:5173'
    ];
    if (!origin || allowed.includes(origin)) {
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
const INTOLERANCE_CATALOG = [
  { id: 'dairy',     label: 'Lácteos',            emoji: '🥛', desc: 'Leche, queso, mantequilla' },
  { id: 'egg',       label: 'Huevo',              emoji: '🥚', desc: 'Huevo y derivados' },
  { id: 'gluten',    label: 'Gluten',             emoji: '🌾', desc: 'Trigo, cebada, centeno' },
  { id: 'grain',     label: 'Grano',              emoji: '🌿', desc: 'Avena, arroz, quinoa' },
  { id: 'peanut',    label: 'Maní',               emoji: '🥜', desc: 'Maní y derivados' },
  { id: 'seafood',   label: 'Pescado',            emoji: '🐟', desc: 'Salmón, atún, anchoas' },
  { id: 'sesame',    label: 'Sésamo',             emoji: '🫘', desc: 'Semillas y aceite de sésamo' },
  { id: 'shellfish', label: 'Mariscos',           emoji: '🦐', desc: 'Camarón, langosta, cangrejo' },
  { id: 'soy',       label: 'Soja',               emoji: '🫛', desc: 'Tofu, salsa de soja, tempeh' },
  { id: 'sulfite',   label: 'Sulfitos',           emoji: '🍷', desc: 'Vino, frutos secos, conservas' },
  { id: 'tree_nut',  label: 'Frutos Secos',       emoji: '🌰', desc: 'Almendras, nueces, avellanas' },
  { id: 'wheat',     label: 'Trigo',              emoji: '🍞', desc: 'Harina, pan, sémola' },
  { id: 'corn',      label: 'Maíz',               emoji: '🌽', desc: 'Jarabe de maíz, dextrosa' },
  { id: 'sibo',      label: 'SIBO',               emoji: '🦠', desc: 'Dieta baja en FODMAPs' },
];

const MEDICAL_TRIGGERS = {
  'dairy':     ['casein', 'whey', 'lactose', 'ghee', 'lactalbumin', 'nougat', 'butter fat', 'cream', 'cheese', 'milk'],
  'egg':       ['albumin', 'lysozyme', 'mayonnaise', 'meringue', 'ovalbumin', 'surimi'],
  'gluten':    ['maltodextrin', 'modified food starch', 'hydrolyzed wheat protein', 'seitan', 'triticale', 'spelt', 'kamut', 'semolina', 'durum'],
  'grain':     ['barley', 'buckwheat', 'bulgur', 'couscous', 'farro', 'millet', 'oats', 'quinoa', 'rice', 'rye', 'sorghum'],
  'peanut':    ['arachis oil', 'groundnut', 'beer nuts', 'monkey nuts', 'peanut butter', 'peanut flour'],
  'seafood':   ['anchovy', 'cod', 'fish sauce', 'herring', 'mackerel', 'salmon', 'sardine', 'tilapia', 'trout', 'tuna'],
  'sesame':    ['benne seeds', 'gingelly oil', 'halvah', 'hummus', 'sesame oil', 'tahini'],
  'shellfish': ['crab', 'crayfish', 'lobster', 'prawn', 'shrimp', 'scallop', 'clam', 'mussel', 'oyster', 'squid'],
  'soy':       ['edamame', 'miso', 'natto', 'soy sauce', 'soy lecithin', 'soy protein', 'tempeh', 'tofu', 'soya'],
  'sulfite':   ['sulfur dioxide', 'sodium bisulfite', 'sodium metabisulfite', 'potassium bisulfite', 'dried fruit', 'wine'],
  'tree_nut':  ['almond', 'brazil nut', 'cashew', 'chestnut', 'hazelnut', 'macadamia', 'marzipan', 'pecan', 'pine nut', 'pistachio', 'walnut', 'praline'],
  'wheat':     ['bread flour', 'bulgur', 'couscous', 'durum', 'einkorn', 'emmer', 'flour', 'semolina', 'spelt'],
  'corn':      ['high fructose corn syrup', 'dextrose', 'sorbitol', 'xanthan gum', 'maize', 'cornstarch', 'corn flour'],
  'sibo':      ['garlic', 'garlic powder', 'onion', 'onion powder', 'inulin', 'chicory root', 'agave', 'honey', 'xylitol', 'apple', 'pear', 'watermelon', 'mango', 'asparagus', 'artichoke', 'cauliflower', 'mushroom', 'wheat', 'rye', 'milk', 'yogurt', 'ice cream']
};

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
    }

    const data = await RecipeProvider.getRecipes(req.query, userProfile);

    // ── Telemetría de búsquedas ───────────────────────────────────────────
    const query = req.query.query?.trim() || '';
    const isEmpty = !data || data.length === 0;

    if (query.length >= 3) {
      ActivityLogger.log('SEARCH', { query }, {
        userId: req.user?.id || null,
        ip: req.ip,
        failedSearch: isEmpty
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
