import { Schema } from "effect";

const Ids = Schema.Struct({
  trakt: Schema.Int,
  slug: Schema.optional(Schema.NullOr(Schema.String)),
});

const Year = Schema.optional(Schema.NullOr(Schema.Int));

const Work = Schema.Struct({ title: Schema.String, year: Year, ids: Ids });

const Episode = Schema.Struct({
  season: Schema.Int,
  number: Schema.Int,
  title: Schema.optional(Schema.NullOr(Schema.String)),
  ids: Ids,
});

const MOVIE = { type: Schema.Literal("movie"), movie: Work };

const SHOW = { type: Schema.Literal("show"), show: Work };

const SEASON = { type: Schema.Literal("season"), show: Work };

const EPISODE = { type: Schema.Literal("episode"), show: Work, episode: Episode };

const WATCHED = { watched_at: Schema.String };

const Watched = Schema.Union([
  Schema.Struct({ ...WATCHED, ...MOVIE }),
  Schema.Struct({ ...WATCHED, ...EPISODE }),
]);

export const History = Schema.Array(Watched);

const RATED = { rated_at: Schema.String, rating: Schema.Int };

const Rated = Schema.Union([
  Schema.Struct({ ...RATED, ...MOVIE }),
  Schema.Struct({ ...RATED, ...SHOW }),
  Schema.Struct({ ...RATED, ...SEASON }),
  Schema.Struct({ ...RATED, ...EPISODE }),
]);

export const Ratings = Schema.Array(Rated);

export type TraktWork = typeof Work.Type;

export type TraktEpisode = typeof Episode.Type;

export type TraktWatched = typeof Watched.Type;

export type TraktRated = typeof Rated.Type;
