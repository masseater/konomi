import { Schema } from "effect";

import { MEDIA_TYPES } from "./api.ts";

const OptionalText = Schema.String.pipe(Schema.NullOr, Schema.optional);

export const Query = Schema.Struct({
  query: Schema.String,
  variables: Schema.Struct({
    user: Schema.String,
    type: Schema.Literals(MEDIA_TYPES),
    page: Schema.Int,
  }),
});

const Title = Schema.Struct({ romaji: OptionalText, native: OptionalText, english: OptionalText });

const Genres = Schema.String.pipe(Schema.Array, Schema.NullOr, Schema.optional);

const Media = Schema.Struct({
  id: Schema.Int,
  siteUrl: Schema.String,
  type: Schema.Literals(MEDIA_TYPES),
  seasonYear: Schema.Int.pipe(Schema.NullOr, Schema.optional),
  title: Title,
  genres: Genres,
});

const Entry = Schema.Struct({
  status: Schema.String,
  score: Schema.Finite.pipe(Schema.NullOr, Schema.optional),
  updatedAt: Schema.Int.pipe(Schema.NullOr, Schema.optional),
  media: Media,
});

const PageInfo = Schema.Struct({ hasNextPage: Schema.Boolean, currentPage: Schema.Int });

const Page = Schema.Struct({ mediaList: Schema.Array(Entry), pageInfo: PageInfo });

export const MediaListPage = Schema.Struct({ data: Schema.Struct({ Page }) });

export type AniListEntry = typeof Entry.Type;

export type AniListMedia = typeof Media.Type;
