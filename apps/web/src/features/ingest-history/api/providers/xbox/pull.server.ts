import { Effect } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import { orEmpty } from "#/features/ingest-history/api/providers/subject-in";

import { API, FIELD, HEADERS } from "./api.ts";
import { FriendsResponse, TitlesResponse } from "./schemas.ts";
import { friendObservationsOf, playedObservationsOf } from "./subjects.ts";

export const pullXbox = pullOf({
  provider: "xbox",
  cursor: "kept",
  observe: ({ credential, fetchedAt }) =>
    Effect.gen(function* xbox() {
      const headers = {
        ...HEADERS,
        "X-Authorization": yield* requireField(credential, FIELD.apiKey),
      };
      const titles = yield* fetchJson({
        url: `${API}/titles`,
        headers,
        schema: TitlesResponse,
      }).pipe(Effect.withSpan("xbox.titles"));
      const friends = yield* fetchJson({
        url: `${API}/friends`,
        headers,
        schema: FriendsResponse,
      }).pipe(Effect.withSpan("xbox.friends"));
      return [
        ...playedObservationsOf(orEmpty(titles.content.titles)),
        ...friendObservationsOf(fetchedAt)(orEmpty(friends.content.people)),
      ];
    }),
});
