import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const Users = Schema.Struct({
  items: Schema.Array(Schema.Struct({ id: Schema.Int, name: Schema.String })),
});

const Artist = Schema.Struct({ id: Schema.Int, name: Schema.String });

const Credit = Schema.Struct({
  artist: Schema.optional(Schema.NullOr(Artist)),
  categories: OptionalText,
});

const Credits = Schema.optional(Schema.NullOr(Schema.Array(Credit)));

const Song = Schema.Struct({
  id: Schema.Int,
  name: Schema.String,
  lengthSeconds: Schema.optional(Schema.NullOr(Schema.Int)),
  publishDate: OptionalText,
  songType: OptionalText,
  artists: Credits,
});

const Rated = Schema.Struct({ date: Schema.String, rating: Schema.String, song: Song });

const RatedSongs = Schema.Struct({ items: Schema.Array(Rated) });

type VocaDbCredit = typeof Credit.Type;

type VocaDbRated = typeof Rated.Type;

export type { VocaDbCredit, VocaDbRated };
export { RatedSongs, Users };
