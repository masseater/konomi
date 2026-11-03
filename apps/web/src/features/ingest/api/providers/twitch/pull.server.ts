import { Array as Arr, Clock, Effect, Option, Schema, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { fetchJson } from "#/features/ingest/api/providers/http.server";
import type { Headers } from "#/features/ingest/api/providers/http.server";
import { epochOr } from "#/features/ingest/api/providers/observe";
import { collectPages, pagesFor } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, LIMIT } from "./api";
import { headersOf } from "./headers.server";
import { FollowedChannels, Users } from "./schemas";
import { channelOf } from "./subjects";

const CursorJson = Schema.fromJsonString(Schema.Struct({ backfilled: Schema.Boolean }));
const decodeCursor = Schema.decodeUnknownOption(CursorJson);
const encodeCursor = Schema.encodeEffect(CursorJson);

const pullFollowed = ({
  headers,
  userId,
  pages,
  fetchedAt,
}: Readonly<{ headers: Headers; userId: string; pages: number; fetchedAt: number }>): Effect.Effect<
  readonly Observation[],
  ProviderError
> => {
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
      Arr.map((followed): Observation => ({
        kind: "followed",
        subject: channelOf(followed),
        occurredAtMs: at(followed.followed_at),
      })),
    ),
  );
};

const pullTwitch = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* twitch() {
    const headers = yield* headersOf(credential);
    const { data } = yield* fetchJson({ url: `${API}/users`, headers, schema: Users });
    const { backfilled } = pipe(
      decodeCursor(cursor),
      Option.getOrElse(() => ({ backfilled: false })),
    );
    const fetchedAt = yield* Clock.currentTimeMillis;
    const observations = yield* pipe(
      Arr.head(data),
      Option.match({
        onNone: () => Effect.succeed(Arr.empty<Observation>()),
        onSome: ({ id }) =>
          pullFollowed({
            headers,
            userId: id,
            pages: pagesFor(backfilled),
            fetchedAt,
          }),
      }),
    );
    return {
      observations,
      cursor: yield* encodeCursor({ backfilled: true }).pipe(Effect.orDie),
    };
  }).pipe(Effect.withSpan("twitch.pull"));

export { pullTwitch };
