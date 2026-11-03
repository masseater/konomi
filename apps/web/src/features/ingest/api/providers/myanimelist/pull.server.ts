import { Array as Arr, Clock, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import type { Headers } from "#/features/ingest/api/providers/http.server";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

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

const pullMyAnimeList = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* myanimelist() {
    const account = yield* Effect.all({
      user: requireField(credential, FIELD.user).pipe(Effect.map(encodeURIComponent)),
      clientId: requireField(credential, FIELD.clientId),
    });
    const pull = pullList({
      user: account.user,
      headers: { "X-MAL-CLIENT-ID": account.clientId },
      pages: pagesOf(cursor),
      fetchedAt: yield* Clock.currentTimeMillis,
    });
    const lists = yield* pipe(LISTS, Arr.map(pull), Effect.all);
    return { observations: Arr.flatten(lists), cursor: yield* BACKFILLED };
  }).pipe(Effect.withSpan("myanimelist.pull"));

export { pullMyAnimeList };
