"use server";

import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from "../schema";
import { eq } from "drizzle-orm";
import { InsertVideo, videosTable } from "../schema";
import { db } from "@/db/db";
import { videosTable as dbVideosTable } from "@/db/schema/videos";

// Create a typed database instance
const typedDb = drizzle(sql, { schema });

export const createVideo = async (data: Omit<InsertVideo, 'id'>) => {
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

export const updateVideo = async (id: bigint, data: Partial<Omit<InsertVideo, 'id'>>) => {
  const updateData = { ...data };
  delete (updateData as any).id; // Remove 'id' from the update data
  return typedDb.update(schema.videosTable)
    .set(updateData)
    .where(eq(schema.videosTable.id, Number(id)))
    .returning();
};

export const deleteVideo = async (id: bigint) => {
  return typedDb.delete(schema.videosTable).where(eq(schema.videosTable.id, Number(id)));
};

export const getVideoByMuxUploadId = async (muxUploadId: string) => {
  const result = await db
    .select()
    .from(dbVideosTable)
    .where(eq(dbVideosTable.muxUploadId, muxUploadId))
    .limit(1);

  return result[0] || null;
};
