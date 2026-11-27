import { Effect, Option, pipe } from "effect";

import { fieldOf, requireField } from "#/features/ingest-history/api/providers/credential-field";
import { collectNumberedPages } from "#/features/ingest-history/api/providers/numbered-pages.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD, LIMIT } from "./api";
import { Items } from "./schemas";
import { stockObservationsOf } from "./subjects";

const NUMBERING = { param: "page", limit: LIMIT, start: 1 } as const;

export const pullQiita = pullOf({
  provider: "qiita",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* qiita() {
      const name = yield* requireField(credential, FIELD.user);
      const user = encodeURIComponent(name);
      const headers = pipe(
        fieldOf(credential, FIELD.token),
        Option.map((token) => ({ Authorization: `Bearer ${token}` })),
        Option.getOrElse(() => ({})),
      );
      const stocks = yield* collectNumberedPages({
        base: `${API}/users/${user}/stocks?per_page=${LIMIT}`,
        numbering: NUMBERING,
        headers,
        pages: pages,
        schema: Items,
        itemsOf: (items) => items,
      });
      return stockObservationsOf(fetchedAt)(stocks);
    }),
});
