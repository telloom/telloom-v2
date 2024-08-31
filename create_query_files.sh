#!/bin/bash

# Array of table names
tables=(
  "object_categories"
  "video_transcripts"
  "objects"
  "videos"
  "prompts"
  "prompt_responses"
  "prompt_categories"
  "profiles"
  "offerings"
  "packages"
  "products"
  "object_category_links"
  "prompt_category_links"
  "purchases"
  "subscription_entitlements"
  "entitlements"
  "subscriptions"
  "thematic_videos"
  "video_notes"
)

# Function to convert snake_case to PascalCase
snake_to_pascal() {
  echo "$1" | sed -r 's/(^|_)([a-z])/\U\2/g'
}

# Create the queries directory if it doesn't exist
mkdir -p db/queries

# Loop through the tables and create a query file for each
for table in "${tables[@]}"; do
  pascal_case=$(snake_to_pascal "$table")
  filename="db/queries/${table}-queries.ts"

  cat << EOF > "$filename"
"use server";

import { db } from "../db";
import { ${table}Table } from "../schema";
import { eq } from "drizzle-orm";
import { Insert${pascal_case}, Select${pascal_case} } from "../schema/${table}";

export const create${pascal_case} = async (data: Insert${pascal_case}) => {
  return db.insert(${table}Table).values(data).returning();
};

export const get${pascal_case}ById = async (id: bigint) => {
  return db.query.${table}Table.findFirst({
    where: eq(${table}Table.id, id),
  });
};

export const getAll${pascal_case}s = async () => {
  return db.query.${table}Table.findMany();
};

export const update${pascal_case} = async (id: bigint, data: Partial<Insert${pascal_case}>) => {
  return db.update(${table}Table).set(data).where(eq(${table}Table.id, id)).returning();
};

export const delete${pascal_case} = async (id: bigint) => {
  return db.delete(${table}Table).where(eq(${table}Table.id, id));
};
EOF

  echo "Created $filename"
done

echo "All query files have been created."