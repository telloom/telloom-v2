"use server";

import { PrismaClient } from '@prisma/client';
import { ActionState } from "../types";
import { revalidatePath } from "next/cache";

const prisma = new PrismaClient();

export async function createProfileAction(data: any): Promise<ActionState> {
  try {
    const newProfile = await prisma.profile.create({
      data: data,
    });
    revalidatePath("/profiles");
    return { status: "success", message: "Profile created successfully", data: newProfile };
  } catch (error) {
    return { status: "error", message: "Failed to create profile" };
  }
}

export async function updateProfileAction(id: string, data: any): Promise<ActionState> {
  try {
    const updatedProfile = await prisma.profile.update({
      where: { id: id },
      data: data,
    });
    revalidatePath("/profiles");
    return { status: "success", message: "Profile updated successfully", data: updatedProfile };
  } catch (error) {
    return { status: "error", message: "Failed to update profile" };
  }
}

export async function deleteProfileAction(id: string): Promise<ActionState> {
  try {
    await prisma.profile.delete({
      where: { id: id },
    });
    revalidatePath("/profiles");
    return { status: "success", message: "Profile deleted successfully" };
  } catch (error) {
    return { status: "error", message: "Failed to delete profile" };
  }
}

export async function getProfileByIdAction(id: string): Promise<ActionState> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: id },
    });
    return { status: "success", message: "Profile retrieved successfully", data: profile };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve profile" };
  }
}

export async function getAllProfilesAction(): Promise<ActionState> {
  try {
    const profiles = await prisma.profile.findMany();
    return { status: "success", message: "Profiles retrieved successfully", data: profiles };
  } catch (error) {
    return { status: "error", message: "Failed to retrieve profiles" };
  }
}