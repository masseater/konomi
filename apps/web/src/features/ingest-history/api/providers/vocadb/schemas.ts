import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

export const Users = Schema.Struct({
  items: Schema.Array(Schema.Struct({ id: Schema.Int, name: Schema.String })),
});

const Artist = Schema.Struct({ id: Schema.Int, name: Schema.String });

const Credit = Schema.Struct({
  artist: Artist.pipe(Schema.NullOr, Schema.optional),
  categories: OptionalText,
});

const Credits = Credit.pipe(Schema.Array, Schema.NullOr, Schema.optional);

const Song = Schema.Struct({
  id: Schema.Int,
  name: Schema.String,
  lengthSeconds: Schema.Int.pipe(Schema.NullOr, Schema.optional),
  publishDate: OptionalText,
  songType: OptionalText,
  artists: Credits,
});

const Rated = Schema.Struct({ date: Schema.String, rating: Schema.String, song: Song });

export const RatedSongs = Schema.Struct({ items: Schema.Array(Rated) });

export type VocaDbCredit = typeof Credit.Type;

export type VocaDbRated = typeof Rated.Type;
