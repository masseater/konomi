import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

import { ACTIVITY_KINDS, SOURCE_IDS } from "#/shared/config";

export const activity = sqliteTable(
  "activity",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    source: text({ enum: SOURCE_IDS }).notNull(),
    kind: text({ enum: ACTIVITY_KINDS }).notNull(),
    itemId: text().notNull(),
    title: text().notNull(),
    creator: text(),
    url: text().notNull(),
    occurredAtMs: integer().notNull(),
  },
  (table) => [
    uniqueIndex("activity_item").on(table.source, table.kind, table.itemId),
    index("activity_occurred_at").on(table.occurredAtMs),
  ],
);
