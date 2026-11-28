import { Schema } from "effect";

import { LIBRARY_COLUMN, SESSION_COLUMN } from "./api.ts";

export const Library = Schema.Struct({
  [LIBRARY_COLUMN.asin]: Schema.String,
  [LIBRARY_COLUMN.title]: Schema.String,
  [LIBRARY_COLUMN.resourceType]: Schema.String,
  [LIBRARY_COLUMN.ownership]: Schema.String,
  [LIBRARY_COLUMN.acquiredAt]: Schema.optional(Schema.String),
  [LIBRARY_COLUMN.series]: Schema.optional(Schema.String),
});

export const Session = Schema.Struct({
  [SESSION_COLUMN.asin]: Schema.String,
  [SESSION_COLUMN.title]: Schema.String,
  [SESSION_COLUMN.startedAt]: Schema.String,
  [SESSION_COLUMN.readMs]: Schema.optional(Schema.String),
});

export type LibraryRow = typeof Library.Type;
export type SessionRow = typeof Session.Type;
