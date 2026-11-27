import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { userClientOf } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { API, FIELD, LIMIT, LISTS } from "./api";
import { UserList } from "./schemas";
import { entryObservationsOf } from "./subjects";
import type { MalList } from "./subjects";

type Listing = Readonly<{ user: string; headers: Headers; pages: number; fetchedAt: number }>;

const FIELDS = "list_status,genres,start_season";

const pullList =
  ({ user, headers, pages, fetchedAt }: Listing) =>
  (list: MalList): Effect.Effect<readonly Observation[], ProviderError> => {
    const observe = entryObservationsOf({ list, fetchedAt });
    return collectPages({
      first: `${API}/users/${user}/${list}list?fields=${FIELDS}&limit=${LIMIT}&nsfw=true&sort=list_updated_at`,
      pages,
      fetchPage: (url) =>
        fetchJson({ url, headers, schema: UserList }).pipe(
          Effect.map(({ data, paging }) => ({
            items: data,
            next: pipe(
              Option.fromNullishOr(paging),
              Option.flatMap(({ next }) => Option.fromNullishOr(next)),
            ),
          })),
        ),
    }).pipe(Effect.map(Arr.flatMap(observe)));
  };

export const pullMyAnimeList = pullOf({
  provider: "myanimelist",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* myanimelist() {
      const account = yield* userClientOf(credential, FIELD);
      const pull = pullList({
        user: account.user,
        headers: { "X-MAL-CLIENT-ID": account.clientId },
        pages: pages,
        fetchedAt,
      });
      const lists = yield* pipe(LISTS, Arr.map(pull), (pulls) =>
        Effect.all(pulls, { concurrency: 1 }),
      );
      return Arr.flatten(lists);
    }),
});
