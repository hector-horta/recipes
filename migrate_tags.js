import { Recipe } from './backend/models/Recipe.js';
import { connectDB, sequelize } from './backend/config/database.js';
import { normalizeTags } from './backend/utils/tagTranslations.js';

async function migrateTags() {
    await connectDB();

    const recipes = await Recipe.findAll();
    let updated = 0;

    for (const recipe of recipes) {
        const oldTags = recipe.tags || [];
        const newTags = normalizeTags(oldTags);

        if (JSON.stringify(oldTags) !== JSON.stringify(newTags)) {
            recipe.tags = newTags;
            await recipe.save();
            updated++;
            console.log(`Updated: ${recipe.title_es}`);
            console.log(`  ${JSON.stringify(oldTags)} -> ${JSON.stringify(newTags)}`);
        }
    }

    console.log(`\nDone. Updated ${updated} of ${recipes.length} recipes.`);
    await sequelize.close();
}

migrateTags().catch(err => {
    console.error(err);
    process.exit(1);
});
