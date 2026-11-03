import { Array as Arr, Clock, Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import type { Observation } from "#/entities/signal";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { postJson } from "#/features/ingest/api/providers/http.server";
import { instanceOriginOf } from "#/features/ingest/api/providers/instance-origin";
import { epochOr } from "#/features/ingest/api/providers/observe";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { FIELD, LIMIT } from "./api";
import { Favorites, Following, Me, Reactions, Request } from "./schemas";
import { followedOf, noteOf } from "./subjects";

type Reading = Readonly<{ origin: string; token: string; at: (text: string) => number }>;

const call =
  ({ origin, token }: Reading) =>
  <Item>(
    path: string,
    schema: Schema.Decoder<Item>,
    userId: Option.Option<string>,
  ): Effect.Effect<Item, ProviderError> =>
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

const notesOf = (reading: Reading): Effect.Effect<readonly Observation[], ProviderError> =>
  Effect.gen(function* notes() {
    const api = call(reading);
    const note = noteOf(reading.origin);
    const { id } = yield* api("i", Me, Option.none());
    const favorites = yield* api("i/favorites", Favorites, Option.none());
    const reactions = yield* api("users/reactions", Reactions, Option.some(id));
    return [
      ...pipe(
        favorites,
        Arr.map((favorite): Observation => ({
          kind: "collected",
          subject: note(favorite.note),
          occurredAtMs: reading.at(favorite.createdAt),
        })),
      ),
      ...pipe(
        reactions,
        Arr.map((reaction): Observation => ({
          kind: "endorsed",
          subject: note(reaction.note),
          occurredAtMs: reading.at(reaction.createdAt),
        })),
      ),
    ];
  });

const followingOf = (reading: Reading): Effect.Effect<readonly Observation[], ProviderError> =>
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

const pullMisskey = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* misskey() {
    const reading: Reading = {
      origin: yield* instanceOriginOf(FIELD.instance)(credential),
      token: yield* requireField(credential, FIELD.accessToken),
      at: epochOr(yield* Clock.currentTimeMillis),
    };
    return {
      observations: [...(yield* notesOf(reading)), ...(yield* followingOf(reading))],
      cursor,
    };
  }).pipe(Effect.withSpan("misskey.pull"));

export { pullMisskey };
