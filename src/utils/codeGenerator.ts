/**
 * Generates a unique code for master data entities
 * @param prefix - The prefix for the code (e.g., "CUST", "PROD")
 * @param existingCodes - Array of existing codes to check against
 * @returns A new unique code in format PREFIX-XXXX
 */
export function generateCode(prefix: string, existingCodes: string[]): string {
  // Extract all numbers from existing codes that match the pattern
  const codeNumbers = existingCodes
    .filter(code => code && code.startsWith(`${prefix}-`))
    .map(code => {
      const match = code.match(new RegExp(`${prefix}-(\\d+)`));
      return match ? parseInt(match[1]) : 0;
    });

  // Find the highest number
  const maxNum = codeNumbers.length > 0 ? Math.max(...codeNumbers) : 0;
  const newNum = maxNum + 1;

  // Format as PREFIX-0001, PREFIX-0002, etc.
  return `${prefix}-${newNum.toString().padStart(4, "0")}`;
}

