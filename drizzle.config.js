import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Current working directory:', process.cwd());
console.log('Database URL:', process.env.DATABASE_URL);
console.log('Schema path:', path.resolve(__dirname, './db/schema'));

// List schema files
const schemaDir = path.resolve(__dirname, './db/schema');
console.log('Schema files:', fs.readdirSync(schemaDir));

export default defineConfig({
  schema: './db/schema/*',
  out: './db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
});
