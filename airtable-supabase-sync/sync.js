const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Airtable = require('airtable');
const { createClient } = require('@supabase/supabase-js');

// Initialize Airtable
const airtableBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_API_KEY);

async function fetchAirtableRecords(tableName) {
  try {
    const records = [];
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

async function upsertSupabaseRecords(tableName, records) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .upsert(records, { onConflict: 'airtable_record_id' });

    if (error) {
      console.error(`Error upserting ${tableName}:`, error);
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
    category_name: record.fields.Name,
    description: record.fields.Description,
    airtable_record_id: record.id
  }));
  await upsertSupabaseRecords('prompt_categories', formattedRecords);
}

async function syncPrompts() {
  const records = await fetchAirtableRecords('Prompts');
  const formattedRecords = records.map(record => ({
    prompt: record.fields.Prompt,
    prompt_type: record.fields['Prompt Type'],
    context_establishing_question: record.fields['Context Establishing Question'],
    created_at: record.fields['Created At'],
    airtable_record_id: record.id
  }));
  await upsertSupabaseRecords('prompts', formattedRecords);
}

async function syncPromptCategoryLinks() {
  const records = await fetchAirtableRecords('Prompts');
  const formattedRecords = records.flatMap(record =>
    (record.fields['Prompt Category'] || []).map(categoryId => ({
      prompt_id: record.id,
      category_id: categoryId,
      airtable_record_id: `${record.id}_${categoryId}`
    }))
  );
  await upsertSupabaseRecords('prompt_category_links', formattedRecords);
}

async function syncAll() {
  try {
    console.log('Starting sync process...');
    await syncPromptCategories();
    await syncPrompts();
    await syncPromptCategoryLinks();
    console.log('Sync process completed successfully.');
  } catch (error) {
    console.error('Error during sync process:', error);
  }
}

// Run the sync process
syncAll();