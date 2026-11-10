import { sql } from 'drizzle-orm';

// Re-export common schema utilities
export { sqliteTable } from 'drizzle-orm/sqlite-core';
export { getTableColumns } from 'drizzle-orm';
export { text, integer, real, blob, numeric, index, unique } from 'drizzle-orm/sqlite-core';
export { relations } from 'drizzle-orm';

// Milliseconds since epoch, for 'timestamp_ms' columns only. Seconds columns use $defaultFn: their
// DDL keeps this ms default from the CREATE TABLE migrations though the snapshot drops it, so only
// raw SQL inserts reach it. Rebuilding a table converges its DDL.
export const sqliteTimestampMsNow = sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`;
