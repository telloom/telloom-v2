import path from 'path';
import dotenv from 'dotenv';
import Airtable from 'airtable';
import { PrismaClient } from '@prisma/client';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const airtableBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const prisma = new PrismaClient();

interface AirtableRecord {
  id: string;
  fields: { [key: string]: any };
}

async function fetchAirtableRecords(tableName: string): Promise<AirtableRecord[]> {
  try {
    const records: AirtableRecord[] = [];
    await airtableBase(tableName).select().eachPage((pageRecords, fetchNextPage) => {
      records.push(...pageRecords);
      fetchNextPage();
    });
    return records;
  } catch (error) {
    console.error(`Error fetching records from Airtable table ${tableName}:`, error);
    throw error;
  }
}

async function syncPromptCategories() {
  const airtableRecords = await fetchAirtableRecords('Prompt Categories');

  for (const record of airtableRecords) {
    const existingCategory = await prisma.promptCategory.findFirst({
      where: { airtableId: record.id },
    });

    if (existingCategory) {
      await prisma.promptCategory.update({
        where: { id: existingCategory.id },
        data: {
          category: record.fields.Category || 'Uncategorized',
          description: record.fields.Description || null,
          updatedAt: new Date(),
        },
      });
    } else {
      await prisma.promptCategory.create({
        data: {
          id: BigInt(Date.now()), // Generate a unique BigInt ID
          airtableId: record.id,
          category: record.fields.Category || 'Uncategorized',
          description: record.fields.Description || null,
        },
      });
    }
  }

  console.log(`Synced ${airtableRecords.length} prompt categories`);
}

async function syncPrompts() {
  const airtableRecords = await fetchAirtableRecords('Prompts Primary');
  const promptCategories = await prisma.promptCategory.findMany();

  for (const record of airtableRecords) {
    const categoryAirtableId = record.fields['Prompt Category'] && record.fields['Prompt Category'].length > 0
      ? record.fields['Prompt Category'][0]
      : null;

    const category = promptCategories.find((cat) => cat.airtableId === categoryAirtableId);

    const promptData = {
      promptText: record.fields.Prompt || 'Untitled Prompt',
      promptType: record.fields['Prompt Type'] || 'default',
      isContextEstablishing: record.fields['Context Establishing Question'] ? true : false,
      airtableId: record.id,
      promptCategoryId: category ? category.id : null,
      categoryAirtableId: categoryAirtableId,
      updatedAt: new Date(),
    };

    const existingPrompt = await prisma.prompt.findFirst({
      where: { airtableId: record.id },
    });

    if (existingPrompt) {
      await prisma.prompt.update({
        where: { id: existingPrompt.id },
        data: promptData,
      });
    } else {
      await prisma.prompt.create({
        data: promptData,
      });
    }
  }

  console.log(`Synced ${airtableRecords.length} prompts`);
}

async function syncAll() {
  try {
    console.log('Starting sync process...');
    await syncPromptCategories();
    await syncPrompts();
    console.log('Sync process completed successfully.');
  } catch (error) {
    console.error('Error during sync process:', error);
  } finally {
    await prisma.$disconnect();
  }
}

syncAll();