import { Schema } from "effect";

import { VIEWING_COLUMN } from "./api";

const Viewing = Schema.Struct({
  [VIEWING_COLUMN.title]: Schema.String,
  [VIEWING_COLUMN.startedAt]: Schema.optional(Schema.String),
  [VIEWING_COLUMN.endedAt]: Schema.optional(Schema.String),
  [VIEWING_COLUMN.playbackHour]: Schema.optional(Schema.String),
  [VIEWING_COLUMN.secondsViewed]: Schema.optional(Schema.String),
  [VIEWING_COLUMN.material]: Schema.optional(Schema.String),
  [VIEWING_COLUMN.videoType]: Schema.optional(Schema.String),
});

type ViewingRow = typeof Viewing.Type;

export type { ViewingRow };
export { Viewing };
