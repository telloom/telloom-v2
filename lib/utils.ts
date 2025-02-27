import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gets the initials from a first name and last name
 */
export function getInitials(firstName: string = '', lastName: string = ''): string {
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}
