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

interface AirtableRecord {
  id: string;
  fields: { [key: string]: any };
}

async function checkPromptCategoryFields() {
  try {
    console.log('Checking Prompt Categories table fields...\n');
    
    // Get the first record to examine its fields
    const records = await new Promise<AirtableRecord[]>((resolve, reject) => {
      const records: AirtableRecord[] = [];
      airtableBase('Prompt Categories')
        .select({
          maxRecords: 1
        })
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

    if (records.length === 0) {
      console.log('No records found in Prompt Categories table');
      return;
    }

    const firstRecord = records[0];
    
    console.log('Available fields in Prompt Categories:');
    console.log('------------------------------------');
    Object.keys(firstRecord.fields).forEach(fieldName => {
      console.log(`Field: "${fieldName}"`);
      console.log(`Value: ${JSON.stringify(firstRecord.fields[fieldName], null, 2)}`);
      console.log(`Type: ${typeof firstRecord.fields[fieldName]}`);
      console.log('------------------------------------');
    });

    // Now get all records to check theme values
    const allRecords = await new Promise<AirtableRecord[]>((resolve, reject) => {
      const records: AirtableRecord[] = [];
      airtableBase('Prompt Categories')
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

    console.log('\nUnique theme values found:');
    console.log('------------------------------------');
    const uniqueThemes = new Set<string>();
    allRecords.forEach((record: AirtableRecord) => {
      if (record.fields.Themes_Enum) {
        uniqueThemes.add(record.fields.Themes_Enum);
      }
    });
    console.log(Array.from(uniqueThemes).sort());

  } catch (error) {
    console.error('Error checking fields:', error);
  }
}

checkPromptCategoryFields(); 