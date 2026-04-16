import { TagService } from './services/TagService.js';
import { RecipeProvider } from './services/RecipeProvider.js';
import { redisClient } from './services/redis.js';

async function run() {
  await redisClient.connect();
  console.log('Clearing caches...');
  await TagService.invalidateCache();
  await RecipeProvider.clearCache();
  console.log('Done!');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
