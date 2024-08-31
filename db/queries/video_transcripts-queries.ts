"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertVideoTranscript, SelectVideoTranscript } from "../schema/video_transcripts";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createVideoTranscript = async (data: InsertVideoTranscript) => {
  return typedDb.insert(schema.videoTranscriptsTable).values(data).returning();
};

export const getVideoTranscriptById = async (id: bigint) => {
  return typedDb.query.videoTranscriptsTable.findFirst({
    where: eq(schema.videoTranscriptsTable.id, Number(id)),
  });
};

export const getAllVideoTranscripts = async () => {
  return typedDb.query.videoTranscriptsTable.findMany();
};

export const updateVideoTranscript = async (id: bigint, data: Partial<InsertVideoTranscript>) => {
  return typedDb.update(schema.videoTranscriptsTable).set(data).where(eq(schema.videoTranscriptsTable.id, Number(id))).returning();
};

export const deleteVideoTranscript = async (id: bigint) => {
  return typedDb.delete(schema.videoTranscriptsTable).where(eq(schema.videoTranscriptsTable.id, Number(id)));
};
