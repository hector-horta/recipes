import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ActivityLogger } from '../services/ActivityLogger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.join(__dirname, '..', 'ingest_logs');

if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

export function recoveryLogger(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    if (res.statusCode >= 200 && res.statusCode < 300 && body?.recipe) {
      const timestamp = new Date();
      const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
      const slug = (body.recipe.slug || body.recipe.title || 'unknown')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const filename = `${dateStr}_${slug}.json`;
      const filepath = path.join(LOGS_DIR, filename);

      try {
        fs.writeFileSync(filepath, JSON.stringify(body, null, 2), 'utf-8');
        ActivityLogger.info('Recovery log saved', { filename });
      } catch (err) {
        ActivityLogger.error('Recovery log write failed', { error: err.message, filename });
      }
    }

    return originalJson(body);
  };

  next();
}

export function saveIngestLog(recipeData) {
  const timestamp = new Date();
  const dateStr = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const slug = (recipeData.slug || recipeData.title || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const filename = `${dateStr}_${slug}.json`;
  const filepath = path.join(LOGS_DIR, filename);

  try {
    fs.writeFileSync(filepath, JSON.stringify(recipeData, null, 2), 'utf-8');
    ActivityLogger.info('Recovery log saved (manual)', { filename });
  } catch (err) {
    ActivityLogger.error('Recovery log write failed (manual)', { error: err.message, filename });
  }
}
