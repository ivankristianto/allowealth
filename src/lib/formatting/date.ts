/**
 * Format a "YYYY-MM" month key into a short display header (e.g. "Jan '25").
 */
export function formatMonthHeader(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
}
