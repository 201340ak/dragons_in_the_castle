import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
// Aggregate transaction boundary; typed submodels live in lib/engine.ts.
export const sessions = sqliteTable('sessions', { code:text('code').primaryKey(), state:text('state').notNull(), version:integer('version').notNull().default(0), updated:integer('updated').notNull() });
