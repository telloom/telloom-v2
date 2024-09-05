"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertVideo, videosTable } from "../schema";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createVideo = async (data: InsertVideo) => {
  const result = await typedDb.insert(videosTable).values(data).returning();
  return result[0];
};

export const getVideoById = async (id: bigint) => {
  return typedDb.query.videosTable.findFirst({
    where: eq(schema.videosTable.id, Number(id)),
  });
};

export const getAllVideos = async () => {
  return typedDb.query.videosTable.findMany();
};

export const updateVideo = async (id: bigint, data: Partial<InsertVideo>) => {
  return typedDb.update(schema.videosTable).set(data).where(eq(schema.videosTable.id, Number(id))).returning();
};

export const deleteVideo = async (id: bigint) => {
  return typedDb.delete(schema.videosTable).where(eq(schema.videosTable.id, Number(id)));
};
