import { Array as Arr, Effect, Option, pipe } from "effect";

import { userClientOf } from "#/features/ingest-history/api/providers/credential-field";
import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD, LIMIT, LISTS } from "./api.ts";
import { UserList } from "./schemas.ts";
import { entryObservationsOf } from "./subjects.ts";
import type { MalList } from "./subjects.ts";

const FIELDS = "list_status,genres,start_season";

const listOf = (user: string, list: MalList): Listing =>
  listingOf({
    label: `${list}list`,
    source: sourceOf({
      first: `${API}/users/${user}/${list}list?fields=${FIELDS}&limit=${LIMIT}&nsfw=true&sort=list_updated_at`,
      schema: UserList,
    })(({ data, paging }) => ({
      items: data,
      next: pipe(
        Option.fromNullishOr(paging),
        Option.flatMap(({ next }) => Option.fromNullishOr(next)),
      ),
    })),
  })((fetchedAt) => Arr.flatMap(entryObservationsOf({ list, fetchedAt })));

export const pullMyAnimeList = pullOf({
  provider: "myanimelist",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    userClientOf(credential, FIELD).pipe(
      Effect.flatMap(({ user, clientId }) =>
        pulledListings(
          pipe(
            LISTS,
            Arr.map((list) => listOf(user, list)),
          ),
        )({
          headers: { "X-MAL-CLIENT-ID": clientId },
          pages,
          fetchedAt,
        }),
      ),
    ),
});
