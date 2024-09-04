"use server";

import { createProfile, deleteProfile, getAllProfiles, getProfileById, updateProfile } from "../db/queries/profiles-queries";
import { ActionState } from "../types";
import { InsertProfile } from "../db/schema/profiles"; // Add this import
import { revalidatePath } from "next/cache";

export async function createProfileAction(data: InsertProfile): Promise<ActionState> {
  try {
    const newProfile = await createProfile(data);
    revalidatePath("/profiles");
    return { status: "success", message: "Profile created successfully", data: newProfile };
  } catch (error) {
    return { status: "error", message: "Failed to create profile" };
  }
}

export async function updateProfileAction(id: string, data: Partial<InsertProfile>): Promise<ActionState> {
  try {
    const updatedProfile = await updateProfile(id, data);
    revalidatePath("/profiles");
    return { status: "success", message: "Profile updated successfully", data: updatedProfile };
  } catch (error) {
    return { status: "error", message: "Failed to update profile" };
  }
}

export async function deleteProfileAction(id: string): Promise<ActionState> {
  try {
    await deleteProfile(id);
    revalidatePath("/profiles");
    return { status: "success", message: "Profile deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete profile" };
  }
}

export async function getProfileByIdAction(id: string): Promise<ActionState> {
  try {
    const profile = await getProfileById(id);
    return { status: "success", message: "Profile retrieved successfully", data: profile };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve profile" };
  }
}

export async function getAllProfilesAction(): Promise<ActionState> {
  try {
    const profiles = await getAllProfiles();
    return { status: "success", message: "Profiles retrieved successfully", data: profiles };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve profiles" };
  }
}