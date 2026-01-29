/**
 * Nanoid Validation Utility
 * ==========================
 * Validates nanoid format used for IDs in the application (categories, transactions, etc.)
 *
 * Security:
 * - Prevents malformed ID injection
 * - Validates against expected format (21 characters, URL-safe charset)
 * - Protects against path traversal and SQL injection via IDs
 *
 * Nanoid Specification:
 * - Default length: 21 characters
 * - Character set: A-Za-z0-9_- (alphanumeric + underscore + hyphen)
 * - URL-safe, collision-resistant
 */

/**
 * Validate nanoid format
 *
 * @param id - ID to validate
 * @param length - Expected length (default: 21)
 * @returns true if valid nanoid format
 *
 * @example
 * isValidNanoid('V1StGXR8_Z5jdHi6B-myT'); // true
 * isValidNanoid('invalid@id'); // false
 * isValidNanoid('short'); // false
 */
export function isValidNanoid(id: string, length: number = 21): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const pattern = new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
  return pattern.test(id);
}

/**
 * Validate and throw error if invalid
 *
 * @param id - ID to validate
 * @param fieldName - Field name for error message (default: 'ID')
 * @throws Error if invalid nanoid format
 *
 * @example
 * validateNanoid('V1StGXR8_Z5jdHi6B-myT', 'Category ID'); // passes
 * validateNanoid('invalid', 'Category ID'); // throws: "Invalid Category ID format. Expected 21-character nanoid."
 */
export function validateNanoid(id: string, fieldName: string = 'ID'): void {
  if (!isValidNanoid(id)) {
    throw new Error(`Invalid ${fieldName} format. Expected 21-character nanoid.`);
  }
}
