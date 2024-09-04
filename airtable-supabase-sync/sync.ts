import path from 'path';
import dotenv from 'dotenv';
import Airtable from 'airtable';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const airtableBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID!);
const supabase: SupabaseClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_API_KEY!);

interface AirtableRecord {
  id: string;
  fields: { [key: string]: any };
}

interface SupabaseRecord {
  id: number | string;  // Can be number for prompt_categories or string (UUID) for prompts_primary
  airtable_id: string | null;
  [key: string]: any;
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

async function fetchSupabaseRecords(tableName: string): Promise<SupabaseRecord[]> {
  const { data, error } = await supabase.from(tableName).select('*');
  if (error) throw error;
  return data || [];
}

async function getMaxId(tableName: string): Promise<number> {
  const { data, error } = await supabase
    .from(tableName)
    .select('id')
    .order('id', { ascending: false })
    .limit(1);

  if (error) throw error;
  return data && data.length > 0 ? data[0].id : 0;
}

async function upsertSupabaseRecords(tableName: string, records: any[]) {
  const { data, error } = await supabase
    .from(tableName)
    .upsert(records, { 
      onConflict: 'airtable_id',
      ignoreDuplicates: false
    });
  if (error) {
    console.error(`Error upserting ${tableName}:`, error);
    console.error('First record being upserted:', JSON.stringify(records[0], null, 2));
    throw error;
  }
  console.log(`Successfully upserted ${records.length} records to ${tableName}`);
}

async function syncPromptCategories() {
  const airtableRecords = await fetchAirtableRecords('Prompt Categories');
  const supabaseRecords = await fetchSupabaseRecords('prompt_categories');
  let maxId = await getMaxId('prompt_categories');

  const recordMap = new Map(supabaseRecords.map(record => [record.airtable_id, record]));

  const formattedRecords = airtableRecords.map(record => {
    const existingRecord = recordMap.get(record.id);
    if (!existingRecord) {
      maxId++;
    }
    return {
      id: existingRecord ? existingRecord.id : maxId,
      airtable_id: record.id,
      category: record.fields.Category || 'Uncategorized',
      description: record.fields.Description || null,
      created_at: existingRecord?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

  await upsertSupabaseRecords('prompt_categories', formattedRecords);
}

async function syncPrompts() {
  const airtableRecords = await fetchAirtableRecords('Prompts Primary');
  const supabaseRecords = await fetchSupabaseRecords('prompts_primary');

  const recordMap = new Map(supabaseRecords.map(record => [record.airtable_id, record]));

  const formattedRecords = airtableRecords.map(record => {
    const existingRecord = recordMap.get(record.id);
    return {
      id: existingRecord ? existingRecord.id : uuidv4(),  // Generate new UUID for new records
      airtable_id: record.id,
      prompt: record.fields.Prompt || 'Untitled Prompt',
      prompt_type: record.fields['Prompt Type'] || null,
      context_establishing_question: record.fields['Context Establishing Question'] || null,
      category_airtable_id: record.fields['Prompt Category'] && record.fields['Prompt Category'].length > 0
        ? record.fields['Prompt Category'][0]
        : null,
      created_at: existingRecord?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });

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

syncAll();