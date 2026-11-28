import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { jsonListing } from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, LIMIT } from "./api.ts";
import { headersOf } from "./headers.server.ts";
import { FollowedChannels, Users } from "./schemas.ts";
import { channelOf } from "./subjects.ts";

const followedBy = (userId: string): ReturnType<typeof jsonListing> => {
  const first = `${API}/channels/followed?user_id=${userId}&first=${LIMIT}`;
  return jsonListing({
    kind: "followed",
    first,
    schema: FollowedChannels,
    pageOf: ({ data, pagination }) => ({
      items: data,
      next: pipe(
        Option.fromNullishOr(pagination),
        Option.flatMap(({ cursor }) => Option.fromNullishOr(cursor)),
        Option.map((cursor) => `${first}&after=${cursor}`),
      ),
    }),
    subjectOf: (followed) => Option.some(channelOf(followed)),
    occurredAtOf: (followed) => followed.followed_at,
  });
};

export const pullTwitch = pullOf({
  provider: "twitch",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* twitch() {
      const headers = yield* headersOf(credential);
      const { data } = yield* fetchJson({ url: `${API}/users`, headers, schema: Users });
      return yield* pipe(
        Arr.head(data),
        Option.match({
          onNone: () => Effect.succeed(Arr.empty<Observation>()),
          onSome: ({ id }) => followedBy(id)({ headers, pages, fetchedAt }),
        }),
      );
    }),
});
