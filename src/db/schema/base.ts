import { mysqlTable, sqliteTable } from 'drizzle-orm/mysql-core';
import { getTableColumns } from 'drizzle-orm';

// Re-export common schema utilities
export { mysqlTable, sqliteTable, getTableColumns } from 'drizzle-orm/mysql-core';
export {
  varchar,
  text,
  integer,
  bigint,
  boolean,
  date,
  timestamp,
  decimal,
  mysqlEnum,
  index,
  unique,
} from 'drizzle-orm/mysql-core';
export { relations } from 'drizzle-orm';
