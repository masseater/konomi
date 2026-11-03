import { Clock, Effect } from "effect";

import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchFeed, itemsOf } from "#/features/ingest/api/providers/feed.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { FIELD, HEADERS, WEB } from "./api";
import { DiaryFeed } from "./schemas";
import { letterboxdObservationsOf } from "./subjects";

const pullLetterboxd = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* letterboxd() {
    const user = yield* requireField(credential, FIELD.user);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const feed = yield* fetchFeed({
      url: `${WEB}/${encodeURIComponent(user)}/rss/`,
      headers: HEADERS,
      schema: DiaryFeed,
    });
    return {
      observations: letterboxdObservationsOf(fetchedAt)(itemsOf(feed.rss.channel.item)),
      cursor,
    };
  }).pipe(Effect.withSpan("letterboxd.pull"));

export { pullLetterboxd };
