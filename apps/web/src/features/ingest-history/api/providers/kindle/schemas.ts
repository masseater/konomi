import { Schema } from "effect";

import { LIBRARY_COLUMN, SESSION_COLUMN } from "./api";

const Library = Schema.Struct({
  [LIBRARY_COLUMN.asin]: Schema.String,
  [LIBRARY_COLUMN.title]: Schema.String,
  [LIBRARY_COLUMN.resourceType]: Schema.String,
  [LIBRARY_COLUMN.ownership]: Schema.String,
  [LIBRARY_COLUMN.acquiredAt]: Schema.optional(Schema.String),
  [LIBRARY_COLUMN.series]: Schema.optional(Schema.String),
});

const Session = Schema.Struct({
  [SESSION_COLUMN.asin]: Schema.String,
  [SESSION_COLUMN.title]: Schema.String,
  [SESSION_COLUMN.startedAt]: Schema.String,
  [SESSION_COLUMN.readMs]: Schema.optional(Schema.String),
});

type LibraryRow = typeof Library.Type;
type SessionRow = typeof Session.Type;

export type { LibraryRow, SessionRow };
export { Library, Session };
