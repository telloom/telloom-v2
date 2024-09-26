"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from '../types/action-types';
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

/**
 * Create a new subscription.
 */
export async function createSubscriptionAction(data: {
  userId: string;
  planId: bigint;
  startDate: Date;
}): Promise<ActionState> {
  try {
    const newSubscription = await prisma.subscription.create({
      data: data,
    });
    revalidatePath("/subscriptions");
    return { status: "success", message: "Subscription created successfully", data: newSubscription };
  } catch (error) {
    console.error("Failed to create subscription:", error);
    return { status: "error", message: "Failed to create subscription" };
  }
}

/**
 * Update an existing subscription.
 */
export async function updateSubscriptionAction(id: bigint, data: Partial<{
  planId?: bigint;
  endDate?: Date;
  // Add other fields as necessary
}>): Promise<ActionState> {
  try {
    const updatedSubscription = await prisma.subscription.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/subscriptions");
    return { status: "success", message: "Subscription updated successfully", data: updatedSubscription };
  } catch (error) {
    console.error("Failed to update subscription:", error);
    return { status: "error", message: "Failed to update subscription" };
  }
}

/**
 * Delete a subscription.
 */
export async function deleteSubscriptionAction(id: bigint): Promise<ActionState> {
  try {
    await prisma.subscription.delete({
      where: { id: id },
    });
    revalidatePath("/subscriptions");
    return { status: "success", message: "Subscription deleted successfully" };
  } catch (error) {
    console.error("Failed to delete subscription:", error);
    return { status: "error", message: "Failed to delete subscription" };
  }
}

/**
 * Get a subscription by ID.
 */
export async function getSubscriptionByIdAction(id: bigint): Promise<ActionState> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: id },
    });
    if (subscription) {
      return { status: "success", message: "Subscription retrieved successfully", data: subscription };
    } else {
      return { status: "error", message: "Subscription not found" };
    }
  } catch (error) {
    console.error("Failed to retrieve subscription:", error);
    return { status: "error", message: "Failed to retrieve subscription" };
  }
}

/**
 * Get all subscriptions.
 */
export async function getAllSubscriptionsAction(): Promise<ActionState> {
  try {
    const subscriptions = await prisma.subscription.findMany();
    return { status: "success", message: "Subscriptions retrieved successfully", data: subscriptions };
  } catch (error) {
    console.error("Failed to retrieve subscriptions:", error);
    return { status: "error", message: "Failed to retrieve subscriptions" };
  }
}