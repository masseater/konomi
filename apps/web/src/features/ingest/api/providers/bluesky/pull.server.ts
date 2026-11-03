import { Array as Arr, Clock, Effect, Option, Schema, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchJson, postJson } from "#/features/ingest/api/providers/http.server";
import type { Headers } from "#/features/ingest/api/providers/http.server";
import { collectPages, pagesFor } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { FIELD, LIMIT, SERVICE } from "./api";
import { Follows, Likes, Login, Session } from "./schemas";
import { followedOf, postOf } from "./subjects";

const CursorJson = Schema.fromJsonString(Schema.Struct({ backfilled: Schema.Boolean }));
const decodeCursor = Schema.decodeUnknownOption(CursorJson);
const encodeCursor = Schema.encodeEffect(CursorJson);

type Signed = Readonly<{ headers: Headers; did: string; pages: number; fetchedAt: number }>;

const signIn = (credential: Credential): Effect.Effect<typeof Session.Type, ProviderError> =>
  Effect.all({
    identifier: requireField(credential, FIELD.identifier),
    password: requireField(credential, FIELD.appPassword),
  }).pipe(
    Effect.flatMap((body) =>
      postJson({
        url: `${SERVICE}/com.atproto.server.createSession`,
        headers: {},
        payload: Login,
        body,
        schema: Session,
      }),
    ),
  );

const pageUrl = (method: string, did: string): string =>
  `${SERVICE}/${method}?actor=${encodeURIComponent(did)}&limit=${LIMIT}`;

const withCursor =
  (first: string) =>
  (cursor: string | null | undefined): Option.Option<string> =>
    pipe(
      Option.fromNullishOr(cursor),
      Option.map((value) => `${first}&cursor=${encodeURIComponent(value)}`),
    );

const pullLikes = ({
  headers,
  did,
  pages,
  fetchedAt,
}: Signed): Effect.Effect<readonly Observation[], ProviderError> => {
  const first = pageUrl("app.bsky.feed.getActorLikes", did);
  return collectPages({
    first,
    pages,
    fetchPage: (url) =>
      fetchJson({ url, headers, schema: Likes }).pipe(
        Effect.map(({ feed, cursor }) => ({ items: feed, next: withCursor(first)(cursor) })),
      ),
  }).pipe(
    Effect.map(
      Arr.map(({ post }): Observation => ({
        kind: "endorsed",
        subject: postOf(post),
        occurredAtMs: fetchedAt,
      })),
    ),
  );
};

const pullFollows = ({
  headers,
  did,
  pages,
  fetchedAt,
}: Signed): Effect.Effect<readonly Observation[], ProviderError> => {
  const first = pageUrl("app.bsky.graph.getFollows", did);
  return collectPages({
    first,
    pages,
    fetchPage: (url) =>
      fetchJson({ url, headers, schema: Follows }).pipe(
        Effect.map(({ follows, cursor }) => ({ items: follows, next: withCursor(first)(cursor) })),
      ),
  }).pipe(
    Effect.map(
      Arr.map((profile): Observation => ({
        kind: "followed",
        subject: followedOf(profile),
        occurredAtMs: fetchedAt,
      })),
    ),
  );
};

const pullBluesky = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* bluesky() {
    const session = yield* signIn(credential);
    const { backfilled } = pipe(
      decodeCursor(cursor),
      Option.getOrElse(() => ({ backfilled: false })),
    );
    const signed: Signed = {
      headers: { Authorization: `Bearer ${session.accessJwt}` },
      did: session.did,
      pages: pagesFor(backfilled),
      fetchedAt: yield* Clock.currentTimeMillis,
    };
    return {
      observations: [...(yield* pullLikes(signed)), ...(yield* pullFollows(signed))],
      cursor: yield* encodeCursor({ backfilled: true }).pipe(Effect.orDie),
    };
  }).pipe(Effect.withSpan("bluesky.pull"));

export { pullBluesky };
