import { Schema } from "effect";

const Artist = Schema.Struct({
  name: Schema.String,
  url: Schema.optional(Schema.NullOr(Schema.String)),
});

const Scrobbled = Schema.Struct({ uts: Schema.FiniteFromString });

const Track = Schema.Struct({
  name: Schema.String,
  url: Schema.String,
  artist: Artist,
  date: Schema.optional(Schema.NullOr(Scrobbled)),
});

const Tracks = Schema.Union([Schema.Array(Track), Track]);

const PageAttr = Schema.Struct({
  page: Schema.FiniteFromString,
  totalPages: Schema.FiniteFromString,
});

const TrackPage = Schema.Struct({ track: Tracks, "@attr": PageAttr });

const RecentTracks = Schema.Struct({ recenttracks: TrackPage });

const LovedTracks = Schema.Struct({ lovedtracks: TrackPage });

const Cursor = Schema.Struct({
  backfilled: Schema.Boolean,
  latestUts: Schema.optional(Schema.Int),
});

type LastfmTrack = typeof Track.Type;
type LastfmTrackPage = typeof TrackPage.Type;

export type { LastfmTrack, LastfmTrackPage };
export { Cursor, LovedTracks, RecentTracks };
