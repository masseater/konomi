import { Schema } from "effect";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

const PlayParams = Schema.Struct({ id: OptionalText, catalogId: OptionalText });

const Genres = Schema.Array(Schema.String);

const SongAttributes = Schema.Struct({
  name: Schema.String,
  artistName: OptionalText,
  genreNames: Genres.pipe(Schema.NullOr, Schema.optional),
  durationInMillis: Schema.Int.pipe(Schema.NullOr, Schema.optional),
  releaseDate: OptionalText,
  url: OptionalText,
  dateAdded: OptionalText,
  playParams: PlayParams.pipe(Schema.NullOr, Schema.optional),
});

const Song = Schema.Struct({
  id: Schema.String,
  type: Schema.String,
  attributes: SongAttributes.pipe(Schema.NullOr, Schema.optional),
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
