import { sql } from 'drizzle-orm';

// Re-export common schema utilities
export { sqliteTable } from 'drizzle-orm/sqlite-core';
export { getTableColumns } from 'drizzle-orm';
export { text, integer, real, blob, numeric, index, unique } from 'drizzle-orm/sqlite-core';
export { relations } from 'drizzle-orm';

// Matches Drizzle's deprecated defaultNow() for SQLite timestamps.
// Converts SQLite Julian date to Unix timestamp (milliseconds since epoch)
// Formula: (Julian Day - Unix Epoch Julian Day) * milliseconds per day
// Unix Epoch Julian Day = 2440587.5
export const sqliteTimestampNow = sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`;
