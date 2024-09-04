import path from 'path';
import dotenv from 'dotenv';
import Airtable from 'airtable';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Initialize Airtable
const airtableBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);

// Initialize Supabase
const supabase: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_API_KEY!);

interface AirtableRecord {
  id: string;
  fields: {
    [key: string]: any;
  };
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

async function upsertSupabaseRecords(tableName: string, records: any[]) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .upsert(records, { onConflict: 'airtable_id' });
    if (error) {
      console.error(`Error upserting ${tableName}:`, error);
      console.error('First record being upserted:', JSON.stringify(records[0], null, 2));
    } else {
      console.log(`Successfully upserted ${records.length} records to ${tableName}`);
    }
  } catch (error) {
    console.error(`Error in upsertSupabaseRecords for ${tableName}:`, error);
  }
}

async function syncPromptCategories() {
  const records = await fetchAirtableRecords('Prompt Categories');
  const formattedRecords = records.map(record => ({
    airtable_id: record.id,
    category: record.fields.Category || null,
    description: record.fields.Description || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  await upsertSupabaseRecords('prompt_categories', formattedRecords);
}

async function syncPrompts() {
  const records = await fetchAirtableRecords('Prompts Primary');
  const formattedRecords = records.map(record => ({
    airtable_id: record.id,
    prompt: record.fields.Prompt || null,
    prompt_type: record.fields['Prompt Type'] || null,
    context_establishing_question: record.fields['Context Establishing Question'] || null,
    category_airtable_id: record.fields['Prompt Category'] && record.fields['Prompt Category'].length > 0
      ? record.fields['Prompt Category'][0]
      : null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  await upsertSupabaseRecords('prompts_primary', formattedRecords);
}

async function syncAll() {
  try {
    console.log('Starting sync process...');
    await syncPromptCategories();
    await syncPrompts();
    console.log('Sync process completed successfully.');
  } catch (error) {
    console.error('Error during sync process:', error);
  }
}

// Run the sync process
syncAll();