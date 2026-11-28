import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchFeed } from "#/features/ingest-history/api/providers/feed.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import { orEmpty } from "#/features/ingest-history/api/providers/subject-in";

import { FIELD, HEADERS, WEB } from "./api.ts";
import { DiaryFeed } from "./schemas.ts";
import { letterboxdObservationsOf } from "./subjects.ts";

export const pullLetterboxd = pullOf({
  provider: "letterboxd",
  cursor: "kept",
  observe: ({ credential, fetchedAt }) =>
    Effect.gen(function* letterboxd() {
      const user = yield* requireField(credential, FIELD.user);
      const feed = yield* fetchFeed({
        url: `${WEB}/${encodeURIComponent(user)}/rss/`,
        headers: HEADERS,
        schema: DiaryFeed,
      });
      return letterboxdObservationsOf(fetchedAt)(orEmpty(feed.rss.channel.item));
    }),
});
