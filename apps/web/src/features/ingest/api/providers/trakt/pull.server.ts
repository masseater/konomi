import { Clock, Effect } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { collectNumberedPages } from "#/features/ingest/api/providers/numbered-pages.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, FIELD, LIMIT } from "./api";
import { History, Ratings } from "./schemas";
import { historyObservationsOf, ratingObservationsOf } from "./subjects";

const NUMBERING = { param: "page", limit: LIMIT } as const;

const pullTrakt = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* trakt() {
    const account = yield* Effect.all({
      user: requireField(credential, FIELD.user).pipe(Effect.map(encodeURIComponent)),
      clientId: requireField(credential, FIELD.clientId),
    });
    const headers = {
      "Content-Type": "application/json",
      "trakt-api-version": "2",
      "trakt-api-key": account.clientId,
    };
    const pages = pagesOf(cursor);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const history = yield* collectNumberedPages({
      base: `${API}/users/${account.user}/history?limit=${LIMIT}`,
      numbering: NUMBERING,
      headers,
      pages,
      schema: History,
    });
    const ratings = yield* collectNumberedPages({
      base: `${API}/users/${account.user}/ratings?limit=${LIMIT}`,
      numbering: NUMBERING,
      headers,
      pages,
      schema: Ratings,
    });
    return {
      observations: [
        ...historyObservationsOf(fetchedAt)(history),
        ...ratingObservationsOf(fetchedAt)(ratings),
      ],
      cursor: yield* BACKFILLED,
    };
  }).pipe(Effect.withSpan("trakt.pull"));

export { pullTrakt };
