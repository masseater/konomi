import { Clock, Effect } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { OAUTH_FIELD } from "#/features/ingest/api/providers/oauth.server";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { TIMELINES } from "./api";
import { postsPage } from "./posts.server";
import type { Timeline } from "./posts.server";
import type { TwilogLog } from "./schemas";
import { logObservationsOf } from "./subjects";

const FIRST = 1;

const timelineOf =
  ({ accessToken, pages }: Readonly<{ accessToken: string; pages: number }>) =>
  (timeline: Timeline): Effect.Effect<readonly TwilogLog[], ProviderError> =>
    collectPages({
      first: String(FIRST),
      pages,
      fetchPage: (page) => postsPage({ accessToken, timeline, page: Number(page) }),
    });

const pullTwilog = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* twilog() {
    const timeline = timelineOf({
      accessToken: yield* requireField(credential, OAUTH_FIELD.accessToken),
      pages: pagesOf(cursor),
    });
    const fetchedAt = yield* Clock.currentTimeMillis;
    const likes = yield* timeline(TIMELINES.likes);
    const bookmarks = yield* timeline(TIMELINES.bookmarks);
    const observations = [
      ...logObservationsOf({ kind: "endorsed", fetchedAt })(likes),
      ...logObservationsOf({ kind: "collected", fetchedAt })(bookmarks),
    ];
    return { observations, cursor: yield* BACKFILLED };
  }).pipe(Effect.withSpan("twilog.pull"));

export { pullTwilog };
