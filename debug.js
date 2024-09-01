import { generateMigration } from 'drizzle-kit/generate';
import config from './drizzle.config.js';

async function run() {
  try {
    const result = await generateMigration(config);
    console.log('Migration result:', result);
  } catch (error) {
    console.error('Error generating migration:', error);
  }
}

run();
