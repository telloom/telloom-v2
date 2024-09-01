"use server";

import { create{TableName}, delete{TableName}, getAll{TableName}s, get{TableName}ById, update{TableName} } from "@/db/queries/{table-name}-queries";
import { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

export async function create{TableName}Action(data: Insert{TableName}): Promise<ActionState> {
  try {
    const new{TableName} = await create{TableName}(data);
    revalidatePath("/{table-name}s");
    return { status: "success", message: "{TableName} created successfully", data: new{TableName} };
  } catch (error) {
    return { status: "error", message: "Failed to create {table-name}" };
  }
}

export async function update{TableName}Action(id: bigint, data: Partial<Insert{TableName}>): Promise<ActionState> {
  try {
    const updated{TableName} = await update{TableName}(id, data);
    revalidatePath("/{table-name}s");
    return { status: "success", message: "{TableName} updated successfully", data: updated{TableName} };
  } catch (error) {
    return { status: "error", message: "Failed to update {table-name}" };
  }
}

export async function delete{TableName}Action(id: bigint): Promise<ActionState> {
  try {
    await delete{TableName}(id);
    revalidatePath("/{table-name}s");
    return { status: "success", message: "{TableName} deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete {table-name}" };
  }
}

export async function get{TableName}ByIdAction(id: bigint): Promise<ActionState> {
  try {
    const {table-name} = await get{TableName}ById(id);
    return { status: "success", message: "{TableName} retrieved successfully", data: {table-name} };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve {table-name}" };
  }
}

export async function getAll{TableName}sAction(): Promise<ActionState> {
  try {
    const {table-name}s = await getAll{TableName}s();
    return { status: "success", message: "{TableName}s retrieved successfully", data: {table-name}s };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve {table-name}s" };
  }
}