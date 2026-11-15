import { Schema, Tuple } from "effect";

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

const Watchable = Schema.Union([
  Schema.Struct({ type: Schema.Literal("movie"), movie: Work }),
  Schema.Struct({ type: Schema.Literal("show"), show: Work }),
  Schema.Struct({ type: Schema.Literal("season"), show: Work }),
  Schema.Struct({ type: Schema.Literal("episode"), show: Work, episode: Episode }),
]);

const Watched = Watchable.mapMembers(Tuple.map(Schema.fieldsAssign({ watched_at: Schema.String })));

const History = Schema.Array(Watched);

const Rated = Watchable.mapMembers(
  Tuple.map(Schema.fieldsAssign({ rated_at: Schema.String, rating: Schema.Int })),
);

const Ratings = Schema.Array(Rated);

type TraktWork = typeof Work.Type;

type TraktEpisode = typeof Episode.Type;

type TraktWatchable = typeof Watchable.Type;

type TraktWatched = typeof Watched.Type;

type TraktRated = typeof Rated.Type;

export type { TraktEpisode, TraktRated, TraktWatchable, TraktWatched, TraktWork };
export { History, Ratings };
