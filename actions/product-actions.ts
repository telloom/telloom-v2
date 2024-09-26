"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Create a new product.
 */
export async function createProductAction(data: {
  name: string;
  price: number;
  description?: string;
  // Add other fields as necessary
}): Promise<ActionState> {
  try {
    const newProduct = await prisma.product.create({
      data: data,
    });
    revalidatePath("/products");
    return { status: "success", message: "Product created successfully", data: newProduct };
  } catch (error) {
    console.error("Failed to create product:", error);
    return { status: "error", message: "Failed to create product" };
  }
}

/**
 * Update an existing product.
 */
export async function updateProductAction(id: bigint, data: Partial<{
  name: string;
  price: number;
  description?: string;
  // Add other fields as necessary
}>): Promise<ActionState> {
  try {
    const updatedProduct = await prisma.product.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/products");
    return { status: "success", message: "Product updated successfully", data: updatedProduct };
  } catch (error) {
    console.error("Failed to update product:", error);
    return { status: "error", message: "Failed to update product" };
  }
}

/**
 * Delete a product.
 */
export async function deleteProductAction(id: bigint): Promise<ActionState> {
  try {
    await prisma.product.delete({
      where: { id: id },
    });
    revalidatePath("/products");
    return { status: "success", message: "Product deleted successfully" };
  } catch (error) {
    console.error("Failed to delete product:", error);
    return { status: "error", message: "Failed to delete product" };
  }
}

/**
 * Get a product by ID.
 */
export async function getProductByIdAction(id: bigint): Promise<ActionState> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: id },
    });
    if (product) {
      return { status: "success", message: "Product retrieved successfully", data: product };
    } else {
      return { status: "error", message: "Product not found" };
    }
  } catch (error) {
    console.error("Failed to retrieve product:", error);
    return { status: "error", message: "Failed to retrieve product" };
  }
}

/**
 * Get all products.
 */
export async function getAllProductsAction(): Promise<ActionState> {
  try {
    const products = await prisma.product.findMany();
    return { status: "success", message: "Products retrieved successfully", data: products };
  } catch (error) {
    console.error("Failed to retrieve products:", error);
    return { status: "error", message: "Failed to retrieve products" };
  }
}