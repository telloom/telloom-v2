"use server";

import { createProduct, deleteProduct, getAllProducts, getProductById, updateProduct } from "../db/queries/products-queries";
import { ActionState } from "../types";
import { InsertProduct } from "../db/schema/products";
import { revalidatePath } from "next/cache";

export async function createProductAction(data: InsertProduct): Promise<ActionState> {
  try {
    const newProduct = await createProduct(data);
    revalidatePath("/products");
    return { status: "success", message: "Product created successfully", data: newProduct };
  } catch (error) {
    return { status: "error", message: "Failed to create product" };
  }
}

export async function updateProductAction(id: bigint, data: Partial<InsertProduct>): Promise<ActionState> {
  try {
    const updatedProduct = await updateProduct(id, data);
    revalidatePath("/products");
    return { status: "success", message: "Product updated successfully", data: updatedProduct };
  } catch (error) {
    return { status: "error", message: "Failed to update product" };
  }
}

export async function deleteProductAction(id: bigint): Promise<ActionState> {
  try {
    await deleteProduct(id);
    revalidatePath("/products");
    return { status: "success", message: "Product deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete product" };
  }
}

export async function getProductByIdAction(id: bigint): Promise<ActionState> {
  try {
    const product = await getProductById(id);
    return { status: "success", message: "Product retrieved successfully", data: product };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve product" };
  }
}

export async function getAllProductsAction(): Promise<ActionState> {
  try {
    const products = await getAllProducts();
    return { status: "success", message: "Products retrieved successfully", data: products };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve products" };
  }
}