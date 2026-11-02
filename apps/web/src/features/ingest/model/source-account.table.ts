import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { SOURCE_IDS } from "#/shared/config";

import { NEVER_SYNCED, SYNC_STATUSES } from "./sync-status";

export const sourceAccount = sqliteTable("source_account", {
  source: text({ enum: SOURCE_IDS }).primaryKey(),
  sealedSecret: text().notNull(),
  status: text({ enum: SYNC_STATUSES }).notNull().default("waiting"),
  failure: text().notNull().default(""),
  updatedAtMs: integer().notNull(),
  syncedAtMs: integer().notNull().default(NEVER_SYNCED),
});
