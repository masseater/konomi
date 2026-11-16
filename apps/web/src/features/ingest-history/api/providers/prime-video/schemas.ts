import { Schema } from "effect";

import { VIEWING_COLUMN } from "./api";

const SessionViewing = Schema.Struct({
  [VIEWING_COLUMN.title]: Schema.String,
  [VIEWING_COLUMN.startedAt]: Schema.String,
  [VIEWING_COLUMN.endedAt]: Schema.optional(Schema.String),
  [VIEWING_COLUMN.secondsViewed]: Schema.optional(Schema.String),
  [VIEWING_COLUMN.material]: Schema.optional(Schema.String),
});

const HourlyViewing = Schema.Struct({
  [VIEWING_COLUMN.title]: Schema.String,
  [VIEWING_COLUMN.playbackHour]: Schema.String,
  [VIEWING_COLUMN.videoType]: Schema.optional(Schema.String),
});

const Viewing = Schema.Union([SessionViewing, HourlyViewing]);

type SessionViewingRow = typeof SessionViewing.Type;
type HourlyViewingRow = typeof HourlyViewing.Type;
type ViewingRow = typeof Viewing.Type;

export type { HourlyViewingRow, SessionViewingRow, ViewingRow };
export { Viewing };
