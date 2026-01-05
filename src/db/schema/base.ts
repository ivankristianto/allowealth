import { sqliteTable } from 'drizzle-orm/sqlite-core';

// Re-export common schema utilities
export { sqliteTable } from 'drizzle-orm/sqlite-core';
export { getTableColumns } from 'drizzle-orm';
export { text, integer, real, blob, numeric, index, unique } from 'drizzle-orm/sqlite-core';
export { relations } from 'drizzle-orm';
