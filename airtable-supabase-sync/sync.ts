import { PrismaClient } from '@prisma/client';
const path = require('path');
const dotenv = require('dotenv');
const Airtable = require('airtable');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
  throw new Error('Missing required environment variables: AIRTABLE_API_KEY and/or AIRTABLE_BASE_ID');
}

const airtableBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const prisma = new PrismaClient();

interface AirtableRecord {
  id: string;
  fields: { [key: string]: any };
}

interface PromptCategory {
  id: string;
  airtableId: string;
}

async function fetchAirtableRecords(tableName: string): Promise<AirtableRecord[]> {
  try {
    const records: AirtableRecord[] = [];
    await new Promise((resolve, reject) => {
      airtableBase(tableName)
        .select()
        .eachPage(
          function page(pageRecords: AirtableRecord[], fetchNextPage: () => void) {
            records.push(...pageRecords);
            fetchNextPage();
          },
          function done(err: Error | null) {
            if (err) {
              reject(err);
              return;
            }
            resolve(records);
          }
        );
    });
    return records;
  } catch (error) {
    console.error(`Error fetching records from Airtable table ${tableName}:`, error);
    throw error;
  }
}

function mapAirtableThemeToEnum(airtableTheme: string | null): 'LIFE_EXPERIENCES' | 'HEALTH_AND_WELLBEING' | 'WELLBEING' | 'BUSINESS' | 'FOOD' | 'CUSTOM' | 'VALUES_AND_BELIEFS' | 'PERSONAL_HISTORY' | 'CAREER_AND_EDUCATION' | 'CHALLENGES_AND_RESILIENCE' | 'RELATIONSHIPS_AND_COMMUNITY' | 'HOBBIES_AND_INTERESTS' | 'CULTURAL_AND_HERITAGE' | null {
  if (!airtableTheme) return null;
  
  // The theme is already in the correct format in Themes_Enum
  const validThemes = [
    'LIFE_EXPERIENCES',
    'HEALTH_AND_WELLBEING',
    'WELLBEING',
    'BUSINESS',
    'FOOD',
    'CUSTOM',
    'VALUES_AND_BELIEFS',
    'PERSONAL_HISTORY',
    'CAREER_AND_EDUCATION',
    'CHALLENGES_AND_RESILIENCE',
    'RELATIONSHIPS_AND_COMMUNITY',
    'HOBBIES_AND_INTERESTS',
    'CULTURAL_AND_HERITAGE'
  ];

  return validThemes.includes(airtableTheme) ? airtableTheme as any : null;
}

async function syncPromptCategories() {
  const airtableRecords = await fetchAirtableRecords('Prompt Categories');
  console.log(`Found ${airtableRecords.length} prompt categories in Airtable`);

  for (const record of airtableRecords) {
    console.log('\nProcessing category:', record.fields.Category);
    console.log('Raw Airtable theme:', record.fields.Themes_Enum);
    
    const existingCategory = await prisma.promptCategory.findFirst({
      where: { airtableId: record.id },
    });

    const airtableTheme = record.fields.Themes_Enum || null;
    const mappedTheme = mapAirtableThemeToEnum(airtableTheme);
    console.log('Final mapped theme:', mappedTheme);

    const categoryData = {
      airtableId: record.id,
      category: record.fields.Category || 'Uncategorized',
      description: record.fields.Description || null,
      theme: mappedTheme,
      updatedAt: new Date(),
    };

    console.log('Category data:', JSON.stringify(categoryData, null, 2));

    if (existingCategory) {
      await prisma.promptCategory.update({
        where: { id: existingCategory.id },
        data: categoryData,
      });
      console.log('Updated category:', categoryData.category);
    } else {
      await prisma.promptCategory.create({
        data: categoryData,
      });
      console.log('Created category:', categoryData.category);
    }
  }

  console.log(`\nSynced ${airtableRecords.length} prompt categories`);
}

async function syncPrompts() {
  console.log('Starting to sync prompts...');
  
  // First verify the Prompt table exists and is accessible
  try {
    const tableCheck = await prisma.prompt.count();
    console.log(`Current prompt count in database: ${tableCheck}`);
  } catch (error) {
    console.error('Error accessing Prompt table:', error);
    throw new Error('Failed to access Prompt table. Please check your database schema.');
  }

  const airtableRecords = await fetchAirtableRecords('Prompts Primary');
  console.log(`Found ${airtableRecords.length} prompts in Airtable`);
  
  const promptCategories = await prisma.promptCategory.findMany();
  console.log(`Found ${promptCategories.length} prompt categories in database`);

  let syncedCount = 0;
  let errorCount = 0;

  for (const record of airtableRecords) {
    try {
      console.log(`Processing prompt: ${record.fields.Prompt}`);
      console.log('Record data:', JSON.stringify(record.fields, null, 2));
      
      const categoryAirtableId = record.fields['Prompt Category']?.[0] || null;
      const category = promptCategories.find(cat => cat.airtableId === categoryAirtableId);
      
      if (categoryAirtableId && !category) {
        console.log(`Warning: Category not found for airtableId: ${categoryAirtableId}`);
      }

      // Ensure promptText doesn't exceed VARCHAR(255)
      const promptText = (record.fields.Prompt || 'Untitled Prompt').substring(0, 255);

      const promptData = {
        airtableId: record.id,
        promptText,
        promptType: (record.fields['Prompt Type'] || 'default').toLowerCase(),
        isContextEstablishing: Boolean(record.fields['Context Establishing Question']),
        promptCategoryId: category?.id || null,
        categoryAirtableId: categoryAirtableId,
        isObjectPrompt: record.fields['Is Object Prompt'] === true,
        updatedAt: new Date(),
      };

      console.log('Attempting to create/update with data:', JSON.stringify(promptData, null, 2));

      const existingPrompt = await prisma.prompt.findFirst({
        where: { airtableId: record.id },
      });

      if (existingPrompt) {
        const updated = await prisma.prompt.update({
          where: { id: existingPrompt.id },
          data: promptData,
        });
        console.log(`Updated prompt: ${promptData.promptText}`, updated);
      } else {
        const created = await prisma.prompt.create({
          data: promptData,
        });
        console.log(`Created prompt: ${promptData.promptText}`, created);
      }
      syncedCount++;
    } catch (error) {
      console.error(`Error processing prompt ${record.id}:`, error);
      console.error('Full error:', JSON.stringify(error, null, 2));
      errorCount++;
    }
  }

  // Verify final count
  const finalCount = await prisma.prompt.count();
  console.log(`Final prompt count in database: ${finalCount}`);
  console.log(`Sync complete. Successfully synced ${syncedCount} prompts. Errors: ${errorCount}`);
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