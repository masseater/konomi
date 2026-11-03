import { Schema } from "effect";

import { ACTIVITY_COLUMN, HISTORY_COLUMN } from "./api";

const Activity = Schema.Struct({
  [ACTIVITY_COLUMN.profile]: Schema.String,
  [ACTIVITY_COLUMN.startedAt]: Schema.String,
  [ACTIVITY_COLUMN.duration]: Schema.String,
  [ACTIVITY_COLUMN.attributes]: Schema.optional(Schema.String),
  [ACTIVITY_COLUMN.title]: Schema.String,
  [ACTIVITY_COLUMN.supplemental]: Schema.optional(Schema.String),
});

const History = Schema.Struct({
  [HISTORY_COLUMN.title]: Schema.String,
  [HISTORY_COLUMN.date]: Schema.String,
});

type ActivityRow = typeof Activity.Type;
type HistoryRow = typeof History.Type;

export type { ActivityRow, HistoryRow };
export { Activity, History };
