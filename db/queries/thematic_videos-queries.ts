"use server";

import { db } from "../db";
import * as schema from "../schema";
import { thematicVideosTable } from "../schema/thematic_videos";
import { eq } from "drizzle-orm";
import { InsertThematicVideo, SelectThematicVideo } from "../schema/thematic_videos";

// Update the db import to include the schema
import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createThematicVideo = async (data: InsertThematicVideo) => {
  return typedDb.insert(thematicVideosTable).values(data).returning();
};

export const getThematicVideoById = async (id: bigint) => {
  return typedDb.select().from(thematicVideosTable).where(eq(thematicVideosTable.id, Number(id))).limit(1);
};

export const getAllThematicVideos = async () => {
  return typedDb.select().from(thematicVideosTable);
};

export const updateThematicVideo = async (id: bigint, data: Partial<InsertThematicVideo>) => {
  return typedDb.update(thematicVideosTable).set(data).where(eq(thematicVideosTable.id, Number(id))).returning();
};

export const deleteThematicVideo = async (id: bigint) => {
  return typedDb.delete(thematicVideosTable).where(eq(thematicVideosTable.id, Number(id)));
};
