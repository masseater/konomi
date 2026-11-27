import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchFeed, itemsOf } from "#/features/ingest-history/api/providers/feed.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { FIELD, HEADERS, WEB } from "./api";
import { DiaryFeed } from "./schemas";
import { letterboxdObservationsOf } from "./subjects";

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
      return letterboxdObservationsOf(fetchedAt)(itemsOf(feed.rss.channel.item));
    }),
});
