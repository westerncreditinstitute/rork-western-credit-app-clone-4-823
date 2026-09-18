/**
 * Validation utility functions shared across the app
 */

/**
 * Check if a string is a valid UUID (v4 format).
 * Rejects mock user IDs like "1", "demo-123", etc.
 *
 * @param id - The ID to validate
 * @returns true if the ID is a valid UUID, false otherwise
 */
export function isValidUUID(id: string): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
