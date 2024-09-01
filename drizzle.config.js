import * as dotenv from 'dotenv';
import { defineConfig } from 'drizzle-kit';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

dotenv.config();

const configFilename = fileURLToPath(import.meta.url);
const configDirname = path.dirname(configFilename);

console.log('Current working directory:', process.cwd());
console.log('Database URL:', process.env.DATABASE_URL);
console.log('Schema path:', path.resolve(configDirname, './db/schema'));

// List schema files
const schemaDir = path.resolve(configDirname, './db/schema');
console.log('Schema files:', fs.readdirSync(schemaDir));

export default defineConfig({
  schema: './db/schema/*',
  out: './db/migrations',
  driver: 'pg',
  dialect: 'pg', // Add this line
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
});
