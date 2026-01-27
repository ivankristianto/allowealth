// Re-export common schema utilities for PostgreSQL
export { pgTable } from 'drizzle-orm/pg-core';
export { getTableColumns } from 'drizzle-orm';
export { text, integer, boolean, timestamp, serial, index, unique } from 'drizzle-orm/pg-core';
export { relations } from 'drizzle-orm';
