import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { OAUTH_FIELD } from "#/features/ingest-history/api/providers/oauth.server";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

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

export const pullTwilog = pullOf({
  provider: "twilog",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* twilog() {
      const timeline = timelineOf({
        accessToken: yield* requireField(credential, OAUTH_FIELD.accessToken),
        pages: pages,
      });
      const likes = yield* timeline(TIMELINES.likes);
      const bookmarks = yield* timeline(TIMELINES.bookmarks);
      const observations = [
        ...logObservationsOf({ kind: "endorsed", fetchedAt })(likes),
        ...logObservationsOf({ kind: "collected", fetchedAt })(bookmarks),
      ];
      return observations;
    }),
});
