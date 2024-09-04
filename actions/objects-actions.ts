"use server";

import { createObject, deleteObject, getAllObjects, getObjectById, updateObject } from "../db/queries/objects-queries";
import { ActionState } from "../types";
import { InsertObject } from "../db/schema/objects";
import { revalidatePath } from "next/cache";

export async function createObjectAction(data: InsertObject): Promise<ActionState> {
  try {
    const newObject = await createObject(data);
    revalidatePath("/objects");
    return { status: "success", message: "Object created successfully", data: newObject };
  } catch (error) {
    return { status: "error", message: "Failed to create object" };
  }
}

export async function updateObjectAction(id: bigint, data: Partial<InsertObject>): Promise<ActionState> {
  try {
    const updatedObject = await updateObject(id, data);
    revalidatePath("/objects");
    return { status: "success", message: "Object updated successfully", data: updatedObject };
  } catch (error) {
    return { status: "error", message: "Failed to update object" };
  }
}

export async function deleteObjectAction(id: bigint): Promise<ActionState> {
  try {
    await deleteObject(id);
    revalidatePath("/objects");
    return { status: "success", message: "Object deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete object" };
  }
}

export async function getObjectByIdAction(id: bigint): Promise<ActionState> {
  try {
    const object = await getObjectById(id);
    return { status: "success", message: "Object retrieved successfully", data: object };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve object" };
  }
}

export async function getAllObjectsAction(): Promise<ActionState> {
  try {
    const objects = await getAllObjects();
    return { status: "success", message: "Objects retrieved successfully", data: objects };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve objects" };
  }
}