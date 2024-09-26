const fs = require('fs');
const path = require('path');

const directoryPath = './db/queries';

const updateFile = (filePath) => {
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace imports
  content = content.replace(
    /import { db } from "\.\.\/db";/,
    `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();`
  );

  // Replace db with prisma
  content = content.replace(/db\./g, 'prisma.');

  // Update query syntax to Prisma
  content = content.replace(/\.select\(/g, '.findMany({select:');
  content = content.replace(/\.where\(/g, '.findMany({where:');
  content = content.replace(/\.orderBy\(/g, '.findMany({orderBy:');
  content = content.replace(/\.limit\(/g, '.findMany({take:');
  content = content.replace(/\.update\(/g, '.update({where:');
  content = content.replace(/\.delete\(/g, '.delete({where:');
  content = content.replace(/\.insert\(/g, '.create({data:');

  // Close any open parentheses and add closing brace
  content = content.replace(/\)\s*$/gm, '})');

  // Convert eq function calls to Prisma syntax
  content = content.replace(/eq\((\w+)\.id, id\)/g, '$1: { id: Number(id) }');

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${filePath}`);
};

fs.readdirSync(directoryPath).forEach(file => {
  if (file.endsWith('-queries.ts') && file !== 'entitlements-queries.ts') {
    const filePath = path.join(directoryPath, file);
    updateFile(filePath);
  }
});

console.log('All query files have been updated to use Prisma ORM.');