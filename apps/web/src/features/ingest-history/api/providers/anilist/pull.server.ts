import { Array as Arr, Effect, Option, pipe } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { postJson } from "#/features/ingest-history/api/providers/http.server";
import { flatMapEach } from "#/features/ingest-history/api/providers/observe";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { API, FIELD, LIMIT, MEDIA_TYPES } from "./api";
import { MediaListPage, Query } from "./schemas";
import type { AniListEntry } from "./schemas";
import { entryObservationsOf } from "./subjects";

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

type Listing = Readonly<{ user: string; pages: number }>;

const pullList =
  ({ user, pages }: Listing) =>
  (type: (typeof MEDIA_TYPES)[number]): Effect.Effect<readonly AniListEntry[], ProviderError> =>
    collectPages({
      first: String(FIRST),
      pages,
      fetchPage: (page) =>
        postJson({
          url: API,
          headers: { Accept: "application/json" },
          payload: Query,
          body: { query: MEDIA_LIST, variables: { user, type, page: Number(page) } },
          schema: MediaListPage,
        }).pipe(
          Effect.map(({ data }) => ({
            items: data.Page.mediaList,
            next: pipe(
              Option.liftPredicate(data.Page.pageInfo, ({ hasNextPage }) => hasNextPage),
              Option.map(({ currentPage }) => String(currentPage + FIRST)),
            ),
          })),
        ),
    });

export const pullAniList = pullOf({
  provider: "anilist",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* anilist() {
      const user = yield* requireField(credential, FIELD.user);
      const pull = pullList({ user, pages });
      const entries = yield* flatMapEach(MEDIA_TYPES, pull);
      const observe = entryObservationsOf(fetchedAt);
      return pipe(entries, Arr.flatMap(observe));
    }),
});
