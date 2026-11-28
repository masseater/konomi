import { Array as Arr, Effect, Option, pipe } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import { CredentialRejected } from "#/features/ingest-history/model/credential-rejected";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { API, FIELD, LIMIT } from "./api.ts";
import { RatedSongs, Users } from "./schemas.ts";
import { ratedObservationsOf } from "./subjects.ts";

const FIRST = 0;
const HEADERS = { Accept: "application/json" } as const;

const userIdOf = (name: string): Effect.Effect<number, ProviderError> =>
  fetchJson({
    url: `${API}/users?query=${encodeURIComponent(name)}&nameMatchMode=Exact&maxResults=1`,
    headers: HEADERS,
    schema: Users,
  }).pipe(
    Effect.flatMap(({ items }) =>
      pipe(
        Arr.head(items),
        Option.map(({ id }) => id),
        Effect.fromOption,
        Effect.mapError(() => CredentialRejected.make({ message: `VocaDB に ${name} がいない` })),
      ),
    ),
  );

const ratedUrl = (userId: number, start: string): string =>
  `${API}/users/${userId}/ratedSongs?fields=Artists&sort=RatingDate&maxResults=${LIMIT}&start=${start}`;

export const pullVocaDb = pullOf({
  provider: "vocadb",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* vocadb() {
      const userId = yield* requireField(credential, FIELD.user).pipe(Effect.flatMap(userIdOf));
      const rated = yield* collectPages({
        first: String(FIRST),
        pages,
        fetchPage: (start) =>
          fetchJson({ url: ratedUrl(userId, start), headers: HEADERS, schema: RatedSongs }).pipe(
            Effect.map(({ items }) => ({
              items,
              next: pipe(
                Option.liftPredicate(items.length, (count: number) => count >= LIMIT),
                Option.map(() => String(Number(start) + LIMIT)),
              ),
            })),
          ),
      });
      return ratedObservationsOf(fetchedAt)(rated);
    }),
});
