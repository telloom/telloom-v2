/**
 * utils/name-helpers.ts
 * Utility functions for working with names.
 */

/**
 * Generates initials from first and last names.
 * Handles null/undefined names and returns '?' if no valid initials can be generated.
 * @param firstName The first name (optional).
 * @param lastName The last name (optional).
 * @returns A string containing the initials (e.g., "JD") or "?".
 */
export function getInitials(firstName?: string | null, lastName?: string | null): string {
  const firstInitial = firstName?.trim().charAt(0).toUpperCase();
  const lastInitial = lastName?.trim().charAt(0).toUpperCase();

  if (firstInitial && lastInitial) {
    return `${firstInitial}${lastInitial}`;
  } else if (firstInitial) {
    return firstInitial;
  } else if (lastInitial) {
    // Optionally return last initial if first is missing, or stick to standard "first then last"
    // Let's return just the last if first is missing for now, can be adjusted
    return lastInitial;
  }

  // Fallback if no valid initials could be extracted
  return "?";
} 