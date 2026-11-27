import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { epochOr, observationsOf } from "#/features/ingest-history/api/providers/observe";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, LIMIT } from "./api";
import { headersOf } from "./headers.server";
import { FollowedChannels, Users } from "./schemas";
import { channelOf } from "./subjects";

const pullFollowed = ({
  headers,
  userId,
  pages,
  fetchedAt,
}: Readonly<{ headers: Headers; userId: string; pages: number; fetchedAt: number }>): Observing => {
  const first = `${API}/channels/followed?user_id=${userId}&first=${LIMIT}`;
  const at = epochOr(fetchedAt);
  return collectPages({
    first,
    pages,
    fetchPage: (url) =>
      fetchJson({ url, headers, schema: FollowedChannels }).pipe(
        Effect.map(({ data, pagination }) => ({
          items: data,
          next: pipe(
            Option.fromNullishOr(pagination),
            Option.flatMap(({ cursor }) => Option.fromNullishOr(cursor)),
            Option.map((cursor) => `${first}&after=${cursor}`),
          ),
        })),
      ),
  }).pipe(
    Effect.map(
      observationsOf("followed")({
        subjectOf: channelOf,
        occurredAtOf: (followed) => at(followed.followed_at),
      }),
    ),
  );
};

export const pullTwitch = pullOf({
  provider: "twitch",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* twitch() {
      const headers = yield* headersOf(credential);
      const { data } = yield* fetchJson({ url: `${API}/users`, headers, schema: Users });
      const observations = yield* pipe(
        Arr.head(data),
        Option.match({
          onNone: () => Effect.succeed(Arr.empty<Observation>()),
          onSome: ({ id }) =>
            pullFollowed({
              headers,
              userId: id,
              pages,
              fetchedAt,
            }),
        }),
      );
      return observations;
    }),
});
