import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Current working directory:', process.cwd());
console.log('Database URL:', process.env.DATABASE_URL);
console.log('Schema path:', path.resolve('./db/schema'));

// List schema files
const schemaDir = path.resolve('./db/schema');
console.log('Schema files:', fs.readdirSync(schemaDir));

/** @type { import("drizzle-kit").Config } */
export default {
  schema: './db/schema/*',
  out: './db/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL,
  },
};
