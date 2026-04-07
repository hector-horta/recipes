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
  title_en: { type: Sequelize.DataTypes.STRING },
  image_url: { type: Sequelize.DataTypes.STRING },
  image_filename: { type: Sequelize.DataTypes.STRING }
}, {
  tableName: 'recipes',
  underscored: true,
  timestamps: false
});

async function generateImage(prompt) {
  const decoratedPrompt = `Professional editorial food photography of ${prompt}, 8k, macro lens, soft natural lighting, high-end restaurant plating, vibrant colors, shallow depth of field`;

  const res = await fetch('https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-xl', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${NVIDIA_API_KEY}`
    },
    body: JSON.stringify({
      text_prompts: [{ text: decoratedPrompt }],
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
  try {
    await sequelize.authenticate();
    console.log('Connected to database.\n');

    const recipes = await Recipe.findAll({
      where: { image_url: { [Sequelize.Op.ne]: null } },
      attributes: ['id', 'title_es', 'image_url', 'image_filename']
    });

    console.log(`Found ${recipes.length} recipes with image references.\n`);

    const recipesDir = path.join(__dirname, '..', 'public', 'recipes');
    if (!fs.existsSync(recipesDir)) fs.mkdirSync(recipesDir, { recursive: true });

    let regenerated = 0;
    let skipped = 0;
    let failed = 0;

    for (const recipe of recipes) {
      const filename = recipe.image_filename || path.basename(recipe.image_url);
      const filepath = path.join(recipesDir, filename);

      if (fs.existsSync(filepath)) {
        console.log(`SKIP: "${recipe.title_es}" - file already exists (${filename})`);
        skipped++;
        continue;
      }

      console.log(`REGENERATING: "${recipe.title_es}"...`);

      try {
        const { filename: newFilename, url: newUrl } = await generateImage(recipe.title_es);

        await Recipe.update(
          { image_url: newUrl, image_filename: newFilename },
          { where: { id: recipe.id } }
        );

        console.log(`  Updated DB: ${newUrl}\n`);
        regenerated++;

        await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        console.error(`  FAILED: ${err.message}\n`);
        failed++;
      }
    }

    console.log('\n========================================');
    console.log(` Regeneration complete`);
    console.log(`   Regenerated: ${regenerated}`);
    console.log(`   Skipped (exists): ${skipped}`);
    console.log(`   Failed: ${failed}`);
    console.log('========================================');

  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
