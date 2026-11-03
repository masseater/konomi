import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import { epochOr, observeAt } from "#/features/ingest/api/providers/observe";
import type { Fetching } from "#/features/ingest/api/providers/observe";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest/model/provider";

import { API, LIMIT } from "./api";
import { tokenPageOf } from "./page";
import { Subscriptions, Videos } from "./schemas";
import { likedVideoOf, subscribedChannelOf } from "./subjects";

const pullLiked = ({
  headers,
  fetchedAt,
  pages,
}: Fetching & Readonly<{ pages: number }>): Effect.Effect<readonly Observation[], ProviderError> =>
  collectPages({
    first: `${API}/videos?myRating=like&part=snippet,contentDetails&maxResults=${LIMIT}`,
    pages,
    fetchPage: (url) =>
      fetchJson({ url, headers, schema: Videos }).pipe(Effect.map(tokenPageOf(url))),
  }).pipe(
    Effect.map(
      Arr.map((video): Observation => ({
        kind: "endorsed",
        subject: likedVideoOf(video),
        occurredAtMs: fetchedAt,
      })),
    ),
  );

const pullSubscriptions = ({
  headers,
  fetchedAt,
  pages,
}: Fetching & Readonly<{ pages: number }>): Effect.Effect<readonly Observation[], ProviderError> =>
  Effect.gen(function* subscriptions() {
    const items = yield* collectPages({
      first: `${API}/subscriptions?mine=true&part=snippet&maxResults=${LIMIT}`,
      pages,
      fetchPage: (url) =>
        fetchJson({ url, headers, schema: Subscriptions }).pipe(Effect.map(tokenPageOf(url))),
    });
    const followed = observeAt({
      kind: "followed",
      context: Option.none(),
      at: epochOr(fetchedAt),
    });
    return pipe(
      items,
      Arr.map((item) =>
        followed({ subject: subscribedChannelOf(item), occurredAt: item.snippet.publishedAt }),
      ),
      Arr.getSomes,
    );
  });

export { pullLiked, pullSubscriptions };
