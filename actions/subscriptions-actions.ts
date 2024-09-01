"use server";

import { createSubscription, deleteSubscription, getAllSubscriptions, getSubscriptionById, updateSubscription } from "@/db/queries/subscriptions-queries";
import { ActionState } from "@/types";
import { revalidatePath } from "next/cache";

export async function createSubscriptionAction(data: InsertSubscription): Promise<ActionState> {
  try {
    const newSubscription = await createSubscription(data);
    revalidatePath("/subscriptions");
    return { status: "success", message: "Subscription created successfully", data: newSubscription };
  } catch (error) {
    return { status: "error", message: "Failed to create subscription" };
  }
}

export async function updateSubscriptionAction(id: bigint, data: Partial<InsertSubscription>): Promise<ActionState> {
  try {
    const updatedSubscription = await updateSubscription(id, data);
    revalidatePath("/subscriptions");
    return { status: "success", message: "Subscription updated successfully", data: updatedSubscription };
  } catch (error) {
    return { status: "error", message: "Failed to update subscription" };
  }
}

export async function deleteSubscriptionAction(id: bigint): Promise<ActionState> {
  try {
    await deleteSubscription(id);
    revalidatePath("/subscriptions");
    return { status: "success", message: "Subscription deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete subscription" };
  }
}

export async function getSubscriptionByIdAction(id: bigint): Promise<ActionState> {
  try {
    const subscription = await getSubscriptionById(id);
    return { status: "success", message: "Subscription retrieved successfully", data: subscription };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve subscription" };
  }
}

export async function getAllSubscriptionsAction(): Promise<ActionState> {
  try {
    const subscriptions = await getAllSubscriptions();
    return { status: "success", message: "Subscriptions retrieved successfully", data: subscriptions };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve subscriptions" };
  }
}