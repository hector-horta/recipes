import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
if (!NVIDIA_API_KEY) {
  console.error('ERROR: NVIDIA_API_KEY not set');
  process.exit(1);
}

const DB_URL = process.env.DATABASE_URL || 'postgresql://wati_user:wati_password@postgres:5432/wati_db';

const sequelize = new Sequelize(DB_URL, {
  dialect: 'postgres',
  logging: false
});

const Recipe = sequelize.define('Recipe', {
  id: { type: Sequelize.DataTypes.UUID, primaryKey: true },
  title_es: { type: Sequelize.DataTypes.STRING },
  image_url: { type: Sequelize.DataTypes.STRING },
  image_filename: { type: Sequelize.DataTypes.STRING }
}, {
  tableName: 'recipes',
  underscored: true,
  timestamps: false
});

async function generateImage(prompt) {
  const res = await fetch('https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NVIDIA_API_KEY}`
    },
    body: JSON.stringify({
      text_prompts: [{ text: prompt }],
      height: 1024,
      width: 1024,
      cfg_scale: 7,
      steps: 30
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`NVIDIA SDXL error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const imageData = data.artifacts?.[0]?.base64;
  if (!imageData) throw new Error('No image data returned from SDXL');

  const recipesDir = path.join(__dirname, '..', 'public', 'recipes');
  if (!fs.existsSync(recipesDir)) fs.mkdirSync(recipesDir, { recursive: true });

  const filename = `${Date.now()}.jpg`;
  fs.writeFileSync(path.join(recipesDir, filename), Buffer.from(imageData, 'base64'));

  return { filename, url: `/public/recipes/${filename}` };
}

async function main() {
  const jsonPath = process.argv[2];
  if (!jsonPath) {
    console.log('Usage: node regenerateSpecificImages.js <path-to-json>');
    console.log('');
    console.log('JSON format:');
    console.log('[{');
    console.log('  "title_es": "Nombre de la receta",');
    console.log('  "issue": "descripcion de lo que esta mal",');
    console.log('  "prompt": "prompt personalizado (opcional)"');
    console.log('}]');
    process.exit(1);
  }

  const configPath = path.isAbsolute(jsonPath) ? jsonPath : path.join(process.cwd(), jsonPath);
  if (!fs.existsSync(configPath)) {
    console.error(`ERROR: File not found: ${configPath}`);
    process.exit(1);
  }

  let configs;
  try {
    configs = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch (err) {
    console.error(`ERROR: Invalid JSON: ${err.message}`);
    process.exit(1);
  }

  if (!Array.isArray(configs)) {
    console.error('ERROR: JSON must be an array of objects');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('Connected to database.\n');

    for (const config of configs) {
      const { title_es, issue, prompt } = config;
      if (!title_es || !issue) {
        console.log(`SKIP: Missing title_es or issue: ${JSON.stringify(config)}\n`);
        continue;
      }

      const recipe = await Recipe.findOne({ where: { title_es } });
      if (!recipe) {
        console.log(`SKIP: Recipe "${title_es}" not found\n`);
        continue;
      }

      const finalPrompt = prompt || `Professional editorial food photography of ${title_es}, 8k, macro lens, soft natural lighting, high-end restaurant plating, vibrant colors, shallow depth of field, ${issue}`;

      console.log(`REGENERATING: "${title_es}"`);
      console.log(`  Issue: ${issue}`);
      console.log(`  Prompt: ${finalPrompt}\n`);

      try {
        const { filename, url } = await generateImage(finalPrompt);

        await Recipe.update(
          { image_url: url, image_filename: filename },
          { where: { id: recipe.id } }
        );

        console.log(`  Updated DB: ${url}\n`);
        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error(`  FAILED: ${err.message}\n`);
      }
    }

    console.log('Done.');
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
