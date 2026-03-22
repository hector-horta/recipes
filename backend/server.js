// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });
dotenv.config(); // Fallback to local .env if exists

const app = express();
const port = process.env.PORT || 5001;

// Enable CORS for frontend origin
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

import authRoutes from './routes/auth.js';
import favoritesRoutes from './routes/favorites.js';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';

app.use(cors(corsOptions));
app.use(express.json());

// Initialize external services
connectDB();
connectRedis();

app.use('/api/auth', authRoutes);
app.use('/api/favorites', favoritesRoutes);

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

app.get('/api/recipes', optionalAuthenticateToken, async (req, res) => {
  try {
    let userProfile = null;
    if (req.user) {
      userProfile = await Profile.findOne({ where: { user_id: req.user.id } });
    }

    const data = await RecipeProvider.getRecipes(req.query, userProfile);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Backend server listening at http://localhost:${port}`);
});
