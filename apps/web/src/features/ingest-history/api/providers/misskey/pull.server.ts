import { Array as Arr, Clock, Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import type { Observation } from "#/entities/signal";
import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { postJson } from "#/features/ingest-history/api/providers/http.server";
import { instanceOriginOf } from "#/features/ingest-history/api/providers/instance-origin";
import { epochOr } from "#/features/ingest-history/api/providers/observe";
import type { Fetched, Observing } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { FIELD, LIMIT } from "./api";
import { Favorites, Following, Me, Reactions, Request } from "./schemas";
import { followedOf, notedAs } from "./subjects";

type Reading = Readonly<{ origin: string; token: string; at: (text: string) => number }>;

const call =
  ({ origin, token }: Reading) =>
  <Item>(
    path: string,
    schema: Schema.Decoder<Item>,
    userId: Option.Option<string>,
  ): Fetched<Item> =>
    postJson({
      url: `${origin}/api/${path}`,
      headers: { Authorization: `Bearer ${token}` },
      payload: Request,
      body: {
        limit: LIMIT,
        ...pipe(
          userId,
          Option.map((id) => ({ userId: id })),
          Option.getOrElse(() => ({})),
        ),
      },
      schema,
    });

const notesOf = (reading: Reading): Observing =>
  Effect.gen(function* notes() {
    const api = call(reading);
    const { id } = yield* api("i", Me, Option.none());
    const favorites = yield* api("i/favorites", Favorites, Option.none());
    const reactions = yield* api("users/reactions", Reactions, Option.some(id));
    return [
      ...notedAs({ kind: "collected", origin: reading.origin, at: reading.at })(favorites),
      ...notedAs({ kind: "endorsed", origin: reading.origin, at: reading.at })(reactions),
    ];
  });

const followingOf = (reading: Reading): Observing =>
  Effect.gen(function* following() {
    const api = call(reading);
    const { id } = yield* api("i", Me, Option.none());
    const followed = yield* api("users/following", Following, Option.some(id));
    return pipe(
      followed,
      Arr.flatMap(({ followee, createdAt }) =>
        pipe(
          Option.fromNullishOr(followee),
          Option.map((user): Observation => ({
            kind: "followed",
            subject: followedOf(reading.origin)(user),
            occurredAtMs: reading.at(createdAt),
          })),
          Option.toArray,
        ),
      ),
    );
  });

export const pullMisskey = pullOf({
  provider: "misskey",
  cursor: "kept",
  observe: ({ credential }) =>
    Effect.gen(function* misskey() {
      const now = yield* Clock.currentTimeMillis;
      const reading: Reading = {
        origin: yield* instanceOriginOf(FIELD.instance)(credential),
        token: yield* requireField(credential, FIELD.accessToken),
        at: epochOr(now),
      };
      return [...(yield* notesOf(reading)), ...(yield* followingOf(reading))];
    }),
});
