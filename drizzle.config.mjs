import dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config({ path: '.env.local' });

const currentFileUrl = import.meta.url;
const currentFilePath = fileURLToPath(currentFileUrl);
const currentDirPath = dirname(currentFilePath);

console.log('Current working directory:', process.cwd());
console.log('Database URL:', process.env.DATABASE_URL);
console.log('Schema path:', resolve(currentDirPath, './db/schema'));

export default defineConfig({
  schema: './db/schema/*',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Optional: Add migration configuration if needed
  // migrationTableName: 'drizzle_migrations',
  // migrationsFolder: './db/migrations',
});