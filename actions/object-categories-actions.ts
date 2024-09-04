"use server";

import { createObjectCategory, deleteObjectCategory, getAllObjectCategories, getObjectCategoryById, updateObjectCategory } from "../db/queries/object_categories-queries";
import { ActionState } from "../types";
import { InsertObjectCategory } from "../db/schema/object_categories";
import { revalidatePath } from "next/cache";

export async function createObjectCategoryAction(data: InsertObjectCategory): Promise<ActionState> {
  try {
    const newObjectCategory = await createObjectCategory(data);
    revalidatePath("/object-categories");
    return { status: "success", message: "Object category created successfully", data: newObjectCategory };
  } catch (error) {
    return { status: "error", message: "Failed to create object category" };
  }
}

export async function updateObjectCategoryAction(id: bigint, data: Partial<InsertObjectCategory>): Promise<ActionState> {
  try {
    const updatedObjectCategory = await updateObjectCategory(id, data);
    revalidatePath("/object-categories");
    return { status: "success", message: "Object category updated successfully", data: updatedObjectCategory };
  } catch (error) {
    return { status: "error", message: "Failed to update object category" };
  }
}

export async function deleteObjectCategoryAction(id: bigint): Promise<ActionState> {
  try {
    await deleteObjectCategory(id);
    revalidatePath("/object-categories");
    return { status: "success", message: "Object category deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete object category" };
  }
}

export async function getObjectCategoryByIdAction(id: bigint): Promise<ActionState> {
  try {
    const objectCategory = await getObjectCategoryById(id);
    return { status: "success", message: "Object category retrieved successfully", data: objectCategory };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve object category" };
  }
}

export async function getAllObjectCategoriesAction(): Promise<ActionState> {
  try {
    const objectCategories = await getAllObjectCategories();
    return { status: "success", message: "Object categories retrieved successfully", data: objectCategories };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve object categories" };
  }
}