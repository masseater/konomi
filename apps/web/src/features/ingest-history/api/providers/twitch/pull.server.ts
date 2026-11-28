import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import { listingOf, sourceOf } from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, LIMIT } from "./api.ts";
import { headersOf } from "./headers.server.ts";
import { FollowedChannels, Users } from "./schemas.ts";
import { channelOf } from "./subjects.ts";

const followedBy = (userId: string): Listing => {
  const source = sourceOf({
    first: `${API}/channels/followed?user_id=${userId}&first=${LIMIT}`,
    schema: FollowedChannels,
    items: ({ data }) => data,
    next: {
      cursor: "after",
      cursorOf: ({ pagination }) =>
        pipe(
          Option.fromNullishOr(pagination),
          Option.flatMapNullishOr(({ cursor }) => cursor),
        ),
    },
  });
  return listingOf({ label: "followed", source })(
    datedObservationsOf({
      kind: "followed",
      subjectOf: (followed) => Option.some(channelOf(followed)),
      occurredAtOf: (followed) => followed.followed_at,
    }),
  );
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
