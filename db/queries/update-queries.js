const fs = require('fs');
const path = require('path');

const directoryPath = './db/queries';

const updateFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace imports
  content = content.replace(
    /import { db } from "\.\.\/db";/,
    `import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });`
  );

  // Replace db with typedDb
  content = content.replace(/db\./g, 'typedDb.');

  // Convert bigint to Number in eq function calls
  content = content.replace(/eq\((\w+)\.id, id\)/g, 'eq($1.id, Number(id))');

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
};

fs.readdirSync(directoryPath).forEach(file => {
  if (file.endsWith('-queries.ts') && file !== 'entitlements-queries.ts') {
    const filePath = path.join(directoryPath, file);
    updateFile(filePath);
  }
});

console.log('All query files have been updated.');