import { Schema } from "effect";

const Artist = Schema.Struct({
  name: Schema.String,
  url: Schema.String.pipe(Schema.NullOr, Schema.optional),
});

const Scrobbled = Schema.Struct({ uts: Schema.FiniteFromString });

const Track = Schema.Struct({
  name: Schema.String,
  url: Schema.String,
  artist: Artist,
  date: Scrobbled.pipe(Schema.NullOr, Schema.optional),
});

const Tracks = Schema.Union([Schema.Array(Track), Track]);

const PageAttr = Schema.Struct({
  page: Schema.FiniteFromString,
  totalPages: Schema.FiniteFromString,
});

const TrackPage = Schema.Struct({ track: Tracks, "@attr": PageAttr });

export const RecentTracks = Schema.Struct({ recenttracks: TrackPage });

export const LovedTracks = Schema.Struct({ lovedtracks: TrackPage });

export const Cursor = Schema.Struct({
  backfilled: Schema.Boolean,
  latestUts: Schema.optional(Schema.Int),
});

export type LastfmTrack = typeof Track.Type;
export type LastfmTrackPage = typeof TrackPage.Type;
