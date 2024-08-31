"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { videosTable, type InsertVideo } from "../schema";
import { eq } from "drizzle-orm";
import { InsertVideoNote, SelectVideoNote } from "../schema/video_notes";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createVideoNote = async (data: InsertVideo) => {
  return typedDb.insert(videosTable).values(data).returning();
};

export const getVideoNoteById = async (id: bigint) => {
  return typedDb.query.videosTable.findFirst({
    where: eq(videosTable.id, Number(id)),
  });
};

export const getAllVideoNotes = async () => {
  return typedDb.query.videosTable.findMany();
};

export const updateVideoNote = async (id: bigint, data: Partial<InsertVideo>) => {
  return typedDb.update(videosTable).set(data).where(eq(videosTable.id, Number(id))).returning();
};

export const deleteVideoNote = async (id: bigint) => {
  return typedDb.delete(videosTable).where(eq(videosTable.id, Number(id)));
};
