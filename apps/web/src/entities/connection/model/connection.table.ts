import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { PROVIDER_IDS } from "#/shared/config";

import { NEVER_SYNCED, SYNC_STATUSES } from "./sync-status";

export const connection = sqliteTable("connection", {
  provider: text({ enum: PROVIDER_IDS }).primaryKey(),
  method: text().notNull(),
  sealedCredential: text().notNull(),
  cursor: text().notNull().default(""),
  status: text({ enum: SYNC_STATUSES }).notNull().default("waiting"),
  failure: text().notNull().default(""),
  updatedAtMs: integer().notNull(),
  syncedAtMs: integer().notNull().default(NEVER_SYNCED),
});
