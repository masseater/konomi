import { Array as Arr, Clock, Effect, Option, pipe } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { postJson } from "#/features/ingest/api/providers/http.server";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

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

const pullAniList = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* anilist() {
    const user = yield* requireField(credential, FIELD.user);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const pull = pullList({ user, pages: pagesOf(cursor) });
    const lists = yield* pipe(MEDIA_TYPES, Arr.map(pull), Effect.all);
    const observe = entryObservationsOf(fetchedAt);
    return {
      observations: pipe(lists, Arr.flatten, Arr.flatMap(observe)),
      cursor: yield* BACKFILLED,
    };
  }).pipe(Effect.withSpan("anilist.pull"));

export { pullAniList };
