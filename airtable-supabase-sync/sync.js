const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const Airtable = require('airtable');
const { createClient } = require('@supabase/supabase-js');

// Initialize Airtable
const airtableBase = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);

// Initialize Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_API_KEY);

async function checkAirtableAuth() {
  try {
    const bases = await Airtable.base(process.env.AIRTABLE_BASE_ID)('Prompt Categories').select().firstPage();
    console.log('Airtable authentication successful');
    return true;
  } catch (error) {
    console.error('Airtable authentication failed:', error.message);
    return false;
  }
}

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
      .upsert(records, { onConflict: 'airtable_id' });
    if (error) {
      console.error(`Error upserting ${tableName}:`, error);
      console.error('First record being upserted:', JSON.stringify(records[0], null, 2));
    } else {
      console.log(`Successfully upserted ${records.length} records to ${tableName}`);
      if (data && data.length > 0) {
        console.log('Sample upserted record:', JSON.stringify(data[0], null, 2));
      } else {
        console.log('No records were modified during upsert.');
      }
    }
  } catch (error) {
    console.error(`Error in upsertSupabaseRecords for ${tableName}:`, error);
  }
}

async function syncPromptCategories() {
  const records = await fetchAirtableRecords('Prompt Categories');
  console.log('Airtable Prompt Categories data (first 5 records):');
  console.log(JSON.stringify(records.slice(0, 5), null, 2));

  const formattedRecords = records.map(record => {
    console.log('Processing record:', JSON.stringify(record, null, 2));
    return {
      airtable_id: record.id,
      category: record.fields.category || null,
      description: record.fields.Description || null,
    };
  });

  console.log('Formatted Prompt Categories (first 5 records):');
  console.log(JSON.stringify(formattedRecords.slice(0, 5), null, 2));

  await upsertSupabaseRecords('prompt_categories', formattedRecords);
}

async function syncPrompts() {
  const records = await fetchAirtableRecords('Prompts Primary');
  const formattedRecords = records.map(record => {
    const categoryId = record.fields['Prompt Category'] && record.fields['Prompt Category'].length > 0
      ? record.fields['Prompt Category'][0]
      : null;

    return {
      airtable_id: record.id,
      prompt: record.fields.Prompt || null,
      prompt_type: record.fields['Prompt Type'] || null,
      context_establishing_question: record.fields['Context Establishing Question'] || null,
      created_at: record.fields['Created At'] || null,
      category_airtable_id: categoryId, // Store the Airtable category ID
    };
  });

  console.log('Formatted Prompts (first 5 records):');
  console.log(JSON.stringify(formattedRecords.slice(0, 5), null, 2));

  await upsertSupabaseRecords('prompts_primary', formattedRecords);
}

async function syncPromptCategoryLinks() {
  const records = await fetchAirtableRecords('Prompts Primary');
  const formattedRecords = records.flatMap(record =>
    (record.fields['Prompt Category'] || []).map(categoryId => ({
      prompt_airtable_id: record.id,
      category_airtable_id: categoryId,
      airtable_record_id: `${record.id}_${categoryId}`
    }))
  );
  await upsertSupabaseRecords('prompt_category_links', formattedRecords);
}

async function syncAll() {
  try {
    console.log('Checking Airtable authentication...');
    const isAuthValid = await checkAirtableAuth();
    if (!isAuthValid) {
      console.error('Airtable authentication failed. Please check your personal access token.');
      return;
    }
    console.log('Starting sync process...');
    await syncPromptCategories();
    await syncPrompts();
    await updatePromptCategoryIds(); // Add this line
    console.log('Sync process completed successfully.');
  } catch (error) {
    console.error('Error during sync process:', error);
  }
}

// Run the sync process
syncAll();