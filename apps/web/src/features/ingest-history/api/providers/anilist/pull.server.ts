import { Array as Arr, Effect, Option, pipe } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD, LIMIT, MEDIA_TYPES } from "./api.ts";
import { MediaListPage, Query } from "./schemas.ts";
import { entryObservationsOf } from "./subjects.ts";

const FIRST = 1;

const MEDIA_LIST = `query ($user: String, $type: MediaType, $page: Int) {
  Page(page: $page, perPage: ${LIMIT}) {
    mediaList(userName: $user, type: $type, sort: UPDATED_TIME_DESC) {
      status score(format: POINT_100) updatedAt
      media { id siteUrl type seasonYear title { romaji native english } genres }
    }
    pageInfo { hasNextPage currentPage }
  }
}`;

const mediaListOf = (user: string, type: (typeof MEDIA_TYPES)[number]): Listing =>
  listingOf({
    label: type,
    source: sourceOf({
      first: String(FIRST),
      schema: MediaListPage,
      fetch: ({ url: page, headers, schema }) =>
        fetchJson({
          url: API,
          headers,
          schema,
          post: {
            payload: Query,
            value: {
              query: MEDIA_LIST,
              variables: { user, type, page: Number(page) },
            },
          },
        }),
    })(({ data }) => ({
      items: data.Page.mediaList,
      next: pipe(
        Option.liftPredicate(data.Page.pageInfo, ({ hasNextPage }) => hasNextPage),
        Option.map(({ currentPage }) => String(currentPage + FIRST)),
      ),
    })),
  })((fetchedAt) => Arr.flatMap(entryObservationsOf(fetchedAt)));

export const pullAniList = pullOf({
  provider: "anilist",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    requireField(credential, FIELD.user).pipe(
      Effect.flatMap((user) =>
        pulledListings(
          pipe(
            MEDIA_TYPES,
            Arr.map((type) => mediaListOf(user, type)),
          ),
        )({
          headers: { Accept: "application/json" },
          pages,
          fetchedAt,
        }),
      ),
    ),
});
