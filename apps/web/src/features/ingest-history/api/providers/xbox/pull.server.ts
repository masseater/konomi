import { Clock, Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { itemsOf } from "#/features/ingest-history/api/providers/feed.server";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest-history/model/provider";

import { API, FIELD, HEADERS } from "./api";
import { FriendsResponse, TitlesResponse } from "./schemas";
import { friendObservationsOf, playedObservationsOf } from "./subjects";

export const pullXbox = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* xbox() {
    const headers = {
      ...HEADERS,
      "X-Authorization": yield* requireField(credential, FIELD.apiKey),
    };
    const fetchedAt = yield* Clock.currentTimeMillis;
    const titles = yield* fetchJson({ url: `${API}/titles`, headers, schema: TitlesResponse }).pipe(
      Effect.withSpan("xbox.titles"),
    );
    const friends = yield* fetchJson({
      url: `${API}/friends`,
      headers,
      schema: FriendsResponse,
    }).pipe(Effect.withSpan("xbox.friends"));
    return {
      observations: [
        ...playedObservationsOf(itemsOf(titles.content.titles)),
        ...friendObservationsOf(fetchedAt)(itemsOf(friends.content.people)),
      ],
      cursor,
    };
  }).pipe(Effect.withSpan("xbox.pull"));
