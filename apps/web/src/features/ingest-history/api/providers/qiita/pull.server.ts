import { Clock, Effect, Option, pipe } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest-history/api/providers/backfill-cursor";
import { fieldOf, requireField } from "#/features/ingest-history/api/providers/credential-field";
import { collectNumberedPages } from "#/features/ingest-history/api/providers/numbered-pages.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest-history/model/provider";

import { API, FIELD, LIMIT } from "./api";
import { Items } from "./schemas";
import { stockObservationsOf } from "./subjects";

const NUMBERING = { param: "page", limit: LIMIT, start: 1 } as const;

export const pullQiita = ({
  credential,
  cursor,
}: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* qiita() {
    const name = yield* requireField(credential, FIELD.user);
    const user = encodeURIComponent(name);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const headers = pipe(
      fieldOf(credential, FIELD.token),
      Option.map((token) => ({ Authorization: `Bearer ${token}` })),
      Option.getOrElse(() => ({})),
    );
    const stocks = yield* collectNumberedPages({
      base: `${API}/users/${user}/stocks?per_page=${LIMIT}`,
      numbering: NUMBERING,
      headers,
      pages: pagesOf(cursor),
      schema: Items,
      itemsOf: (items) => items,
    });
    return { observations: stockObservationsOf(fetchedAt)(stocks), cursor: yield* BACKFILLED };
  }).pipe(Effect.withSpan("qiita.pull"));
