import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { Statement } from "./statement";

const tasteNote = sqliteTable(
  "taste_note",
  {
    id: integer().primaryKey({ autoIncrement: true }),
    statements: text({ mode: "json" }).$type<readonly Statement[]>().notNull(),
    coversUntilMs: integer().notNull(),
    createdAtMs: integer().notNull(),
  },
  (table) => [index("taste_note_created_at").on(table.createdAtMs)],
);

export { tasteNote };
