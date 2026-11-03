import { Clock, Effect, Option, pipe } from "effect";

import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, FIELD, HEADERS } from "./api";
import { FriendsResponse, TitlesResponse } from "./schemas";
import { friendObservationsOf, playedObservationsOf } from "./subjects";

const orEmpty = <Item>(items: readonly Item[] | undefined): readonly Item[] =>
  pipe(
    Option.fromUndefinedOr(items),
    Option.getOrElse((): readonly Item[] => []),
  );

const pullXbox = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
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
        ...playedObservationsOf(orEmpty(titles.content.titles)),
        ...friendObservationsOf(fetchedAt)(orEmpty(friends.content.people)),
      ],
      cursor,
    };
  }).pipe(Effect.withSpan("xbox.pull"));

export { pullXbox };
