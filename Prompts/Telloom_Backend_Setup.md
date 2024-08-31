
# Telloom Backend Setup Instructions

Welcome to the backend setup guide for **Telloom**, a web app focused on connecting generations by preserving and sharing personal histories through video. This guide will walk you through setting up the backend using Supabase, Drizzle ORM, and Server Actions. The instructions are designed to be simple and clear, keeping in mind that you're new to coding.

## Project Context

**Platform:** Web-based, with future expansion to iOS.

**Core Features:**
- **Prompt Selection:** Swipeable, searchable, and sortable prompts.
- **Video Handling:** Recording, uploading, and attaching media with AI-powered transcription.
- **Privacy Controls:** Default privacy with flexible sharing options.
- **Content Viewing:** Swipeable video prompts with supporting media and notes.
- **Thematic Videos:** Documentary-style video compilation.
- **Subscription Management:** Implemented using RevenueCat.

**Tech Stack:**
- **Frontend:** Next.JS
- **Backend:** Supabase, Drizzle ORM, Server Actions
- **Video Handling:** Mux
- **Styling:** Tailwind CSS
- **Subscription Management:** RevenueCat

## Helpful Links

If you get stuck, refer to the following links:
- [Supabase Docs](https://supabase.com/docs)
- [Drizzle Docs](https://orm.drizzle.team/docs/overview)
- [Drizzle with Supabase Quickstart](https://orm.drizzle.team/learn/tutorial/quickstart-supabase)
- [Mux Documentation](https://docs.mux.com/)
- [RevenueCat Documentation](https://www.revenuecat.com/docs/)

## Step 1: Install Necessary Libraries

First, you need to install the required libraries for your backend:

```bash
npm i drizzle-orm dotenv postgres
npm i -D drizzle-kit
```

## Step 2: Configure Drizzle ORM

Create a `drizzle.config.ts` file at the root of your project with the following content:

```ts
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
});
```

## Step 3: Set Up the Database Connection

In the `/db` folder, create a `db.ts` file to handle the connection to Supabase:

```ts
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

config({ path: ".env.local" });

const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle(client);
```

## Step 4: Integrate Your Existing Supabase Schema

You already have a schema in Supabase. Here’s how you can represent it in Drizzle ORM:

### Create a Schema Folder

In the `/db` folder, create a `/schema` folder.

### Define the Schema

For each table in your Supabase schema, create a corresponding schema file in Drizzle ORM. Here’s an example for the `entitlements` table:

```ts
// db/schema/entitlements.ts
import { bigint, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const entitlementsTable = pgTable("entitlements", {
  id: bigint("id").primaryKey(),
  revenuecatId: text("revenuecat_id").notNull(),
  lookupKey: text("lookup_key").notNull(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().$onUpdate(() => new Date()),
});

export type InsertEntitlement = typeof entitlementsTable.$inferInsert;
export type SelectEntitlement = typeof entitlementsTable.$inferSelect;
```

Repeat this structure for each table in your schema (e.g., `object_categories`, `objects`, etc.).

### Export Schema

In `/db/schema/index.ts`, export all defined schemas:

```ts
export * from "./entitlements";
export * from "./object_categories";
// Add other table schemas as needed
```

## Step 5: Create Queries for Data Interaction

In the `/db/queries` folder, create query files to interact with your tables. Here's an example for the `entitlements` table:

```ts
// db/queries/entitlements-queries.ts
"use server";

import { db } from "../db";
import { entitlementsTable } from "../schema/entitlements";
import { eq } from "drizzle-orm";

export const createEntitlement = async (data: InsertEntitlement) => {
  return db.insert(entitlementsTable).values(data).returning();
};

export const getEntitlementById = async (id: bigint) => {
  return db.query.entitlementsTable.findFirst({
    where: eq(entitlementsTable.id, id),
  });
};

export const getAllEntitlements = async () => {
  return db.query.entitlementsTable.findMany();
};

export const updateEntitlement = async (id: bigint, data: Partial<InsertEntitlement>) => {
  return db.update(entitlementsTable).set(data).where(eq(entitlementsTable.id, id)).returning();
};

export const deleteEntitlement = async (id: bigint) => {
  return db.delete(entitlementsTable).where(eq(entitlementsTable.id, id));
};
```

Repeat for other tables as necessary.

## Step 6: Set Up Server Actions

In the `/actions` folder, create server actions for handling backend logic. Example for `entitlements`:

```ts
// actions/entitlements-actions.ts
"use server";

import { createEntitlement, deleteEntitlement, getAllEntitlements, getEntitlementById, updateEntitlement } from "@/db/queries/entitlements-queries";
import { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

export async function createEntitlementAction(data: InsertEntitlement): Promise<ActionState> {
  try {
    const newEntitlement = await createEntitlement(data);
    revalidatePath("/entitlements");
    return { status: "success", message: "Entitlement created successfully", data: newEntitlement };
  } catch (error) {
    return { status: "error", message: "Failed to create entitlement" };
  }
}

// Other actions like updateEntitlementAction, deleteEntitlementAction, etc.
```

## Step 7: Define Action Types

In `/types/action-types.ts`, define the types for server action responses:

```ts
export type ActionState = {
  status: "success" | "error";
  message: string;
  data?: any;
};
```

In `/types/index.ts`, export all types:

```ts
export * from "./action-types";
```

## Step 8: Run Migrations (Optional)

If you need to make schema revisions, create and apply migrations using Drizzle Kit:

### Generate Migration Files

```bash
npm run db:generate
```

### Apply the Migrations

```bash
npm run db:migrate
```

Use this step only if you need to apply changes to your database schema.

## Step 9: Test Your Setup

Integrate the server actions in your frontend (e.g., in a Next.js `page.tsx` file) to test the backend functionality. Ensure that the queries and actions are working as expected.

## Conclusion

This guide should help you set up the backend for your Telloom web app. The instructions are tailored to your project, focusing on integrating with your existing Supabase schema and ensuring the backend is ready for the core features of your app.

If you encounter any issues or need further clarification, refer back to the helpful links provided or feel free to ask for assistance.
