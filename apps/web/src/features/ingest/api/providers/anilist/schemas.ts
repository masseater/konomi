import { Schema } from "effect";

import { MEDIA_TYPES } from "./api";

const OptionalText = Schema.optional(Schema.NullOr(Schema.String));

const Query = Schema.Struct({
  query: Schema.String,
  variables: Schema.Struct({
    user: Schema.String,
    type: Schema.Literals(MEDIA_TYPES),
    page: Schema.Int,
  }),
});

const Title = Schema.Struct({ romaji: OptionalText, native: OptionalText, english: OptionalText });

const Genres = Schema.optional(Schema.NullOr(Schema.Array(Schema.String)));

const Media = Schema.Struct({
  id: Schema.Int,
  siteUrl: Schema.String,
  type: Schema.Literals(MEDIA_TYPES),
  seasonYear: Schema.optional(Schema.NullOr(Schema.Int)),
  title: Title,
  genres: Genres,
});

const Entry = Schema.Struct({
  status: Schema.String,
  score: Schema.optional(Schema.NullOr(Schema.Finite)),
  updatedAt: Schema.optional(Schema.NullOr(Schema.Int)),
  media: Media,
});

const PageInfo = Schema.Struct({ hasNextPage: Schema.Boolean, currentPage: Schema.Int });

const Page = Schema.Struct({ mediaList: Schema.Array(Entry), pageInfo: PageInfo });

const MediaListPage = Schema.Struct({ data: Schema.Struct({ Page }) });

type AniListEntry = typeof Entry.Type;

type AniListMedia = typeof Media.Type;

export type { AniListEntry, AniListMedia };
export { MediaListPage, Query };
