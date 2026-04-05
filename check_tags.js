import { Recipe } from './backend/models/Recipe.js';
import { connectDB, sequelize } from './backend/config/database.js';

async function checkTags() {
    await connectDB();
    const recipes = await Recipe.findAll({
        attributes: ['id', 'title_es', 'tags'],
        where: { status: 'published' }
    });
    console.log('--- Recipe Tags Check ---');
    const allTags = new Set();
    recipes.forEach(r => {
        console.log(`Recipe: ${r.title_es}`);
        console.log(`  Tags: ${JSON.stringify(r.tags)}`);
        (r.tags || []).forEach(t => allTags.add(t));
        console.log('---');
    });
    console.log('\nAll distinct tags:', Array.from(allTags).sort());
    await sequelize.close();
}

checkTags();
