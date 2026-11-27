import { Array as Arr, Effect, Option, pipe } from "effect";

import {
  epochOr,
  observeAt,
  observationsOf,
} from "#/features/ingest-history/api/providers/observe";
import type { Fetching, Observing } from "#/features/ingest-history/api/providers/observe";

import { API, LIMIT } from "./api";
import { collectTokenPages } from "./page";
import { Subscriptions, Videos } from "./schemas";
import { likedVideoOf, subscribedChannelOf } from "./subjects";

export const pullLiked = ({
  headers,
  fetchedAt,
  pages,
}: Fetching & Readonly<{ pages: number }>): Observing =>
  collectTokenPages({
    first: `${API}/videos?myRating=like&part=snippet,contentDetails&maxResults=${LIMIT}`,
    headers,
    pages,
    schema: Videos,
  }).pipe(
    Effect.map(
      observationsOf("endorsed")({ subjectOf: likedVideoOf, occurredAtOf: () => fetchedAt }),
    ),
  );

export const pullSubscriptions = ({
  headers,
  fetchedAt,
  pages,
}: Fetching & Readonly<{ pages: number }>): Observing =>
  Effect.gen(function* subscriptions() {
    const items = yield* collectTokenPages({
      first: `${API}/subscriptions?mine=true&part=snippet&maxResults=${LIMIT}`,
      headers,
      pages,
      schema: Subscriptions,
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
