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

const OptionalWork = Schema.optional(Schema.NullOr(Work));

const Watched = Schema.Struct({
  watched_at: Schema.String,
  movie: OptionalWork,
  show: OptionalWork,
  episode: Schema.optional(Schema.NullOr(Episode)),
});

const History = Schema.Array(Watched);

const Rated = Schema.Struct({
  rated_at: Schema.String,
  rating: Schema.Int,
  movie: OptionalWork,
  show: OptionalWork,
  episode: Schema.optional(Schema.NullOr(Episode)),
});

const Ratings = Schema.Array(Rated);

type TraktWork = typeof Work.Type;

type TraktEpisode = typeof Episode.Type;

type TraktWatched = typeof Watched.Type;

type TraktRated = typeof Rated.Type;

export type { TraktEpisode, TraktRated, TraktWatched, TraktWork };
export { History, Ratings };
