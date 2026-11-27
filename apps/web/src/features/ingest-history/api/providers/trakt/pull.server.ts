import { Effect, Function as Fn } from "effect";

import { userClientOf } from "#/features/ingest-history/api/providers/credential-field";
import { collectNumberedPages } from "#/features/ingest-history/api/providers/numbered-pages.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD, LIMIT } from "./api";
import { History, Ratings } from "./schemas";
import { historyObservationsOf, ratingObservationsOf } from "./subjects";

const NUMBERING = { param: "page", limit: LIMIT, start: 1 } as const;

export const pullTrakt = pullOf({
  provider: "trakt",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* trakt() {
      const account = yield* userClientOf(credential, FIELD);
      const headers = {
        "Content-Type": "application/json",
        "trakt-api-version": "2",
        "trakt-api-key": account.clientId,
      };
      const history = yield* collectNumberedPages({
        base: `${API}/users/${account.user}/history?limit=${LIMIT}`,
        numbering: NUMBERING,
        headers,
        pages,
        schema: History,
        itemsOf: Fn.identity,
      });
      const ratings = yield* collectNumberedPages({
        base: `${API}/users/${account.user}/ratings?limit=${LIMIT}`,
        numbering: NUMBERING,
        headers,
        pages,
        schema: Ratings,
        itemsOf: Fn.identity,
      });
      return [
        ...historyObservationsOf(fetchedAt)(history),
        ...ratingObservationsOf(fetchedAt)(ratings),
      ];
    }),
});
