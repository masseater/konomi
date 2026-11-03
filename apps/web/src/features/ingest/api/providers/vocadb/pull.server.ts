import { Array as Arr, Clock, Effect, Option, pipe } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import { CredentialRejected } from "#/features/ingest/model/credential-rejected";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, FIELD, LIMIT } from "./api";
import { RatedSongs, Users } from "./schemas";
import { ratedObservationsOf } from "./subjects";

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

const pullVocaDb = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* vocadb() {
    const userId = yield* requireField(credential, FIELD.user).pipe(Effect.flatMap(userIdOf));
    const fetchedAt = yield* Clock.currentTimeMillis;
    const rated = yield* collectPages({
      first: String(FIRST),
      pages: pagesOf(cursor),
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
    return { observations: ratedObservationsOf(fetchedAt)(rated), cursor: yield* BACKFILLED };
  }).pipe(Effect.withSpan("vocadb.pull"));

export { pullVocaDb };
