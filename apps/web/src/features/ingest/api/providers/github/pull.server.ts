import { Clock, Effect } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { collectNumberedPages } from "#/features/ingest/api/providers/numbered-pages.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, FIELD, LIMIT } from "./api";
import { headersOf } from "./headers";
import { Accounts, Stars } from "./schemas";
import { followObservationsOf, starObservationsOf } from "./subjects";

const NUMBERING = { param: "page", limit: LIMIT } as const;

const pullGitHub = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* github() {
    const user = encodeURIComponent(yield* requireField(credential, FIELD.user));
    const headers = headersOf(credential);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const pages = pagesOf(cursor);
    const stars = yield* collectNumberedPages({
      base: `${API}/users/${user}/starred?per_page=${LIMIT}`,
      numbering: NUMBERING,
      headers,
      pages,
      schema: Stars,
    });
    const following = yield* collectNumberedPages({
      base: `${API}/users/${user}/following?per_page=${LIMIT}`,
      numbering: NUMBERING,
      headers,
      pages,
      schema: Accounts,
    });
    const observations = [
      ...starObservationsOf(fetchedAt)(stars),
      ...followObservationsOf(fetchedAt)(following),
    ];
    return { observations, cursor: yield* BACKFILLED };
  }).pipe(Effect.withSpan("github.pull"));

export { pullGitHub };
