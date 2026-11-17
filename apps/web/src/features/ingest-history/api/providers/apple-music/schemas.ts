import { Schema } from "effect";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const PlayParams = Schema.Struct({ id: OptionalText, catalogId: OptionalText });

const Genres = Schema.Array(Schema.String);

const SongAttributes = Schema.Struct({
  name: Schema.String,
  artistName: OptionalText,
  genreNames: Schema.optional(Schema.NullOr(Genres)),
  durationInMillis: Schema.optional(Schema.NullOr(Schema.Int)),
  releaseDate: OptionalText,
  url: OptionalText,
  dateAdded: OptionalText,
  playParams: Schema.optional(Schema.NullOr(PlayParams)),
});

const Song = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  attributes: Schema.optional(Schema.NullOr(SongAttributes)),
});

export const Songs = Schema.Struct({ data: Schema.Array(Song), next: OptionalText });

const Storefront = Schema.Struct({ id: Schema.String });

export const Storefronts = Schema.Struct({ data: Schema.NonEmptyArray(Storefront) });

const Recent = Schema.Array(Schema.String);

export const Cursor = Schema.Struct({
  storefront: Schema.optional(Schema.String),
  recent: Schema.optional(Recent),
  libraryAtMs: Schema.optional(Schema.Finite),
});

export type AppleSong = typeof Song.Type;
