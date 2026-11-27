import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Credential } from "#/entities/connection";
import type { Observation } from "#/entities/signal";
import { requireFields } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson, postJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { followedBy } from "#/features/ingest-history/api/providers/observe";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { FIELD, LIMIT, SERVICE } from "./api";
import { Follows, Likes, Login, Session } from "./schemas";
import { followedOf, postOf } from "./subjects";

type Signed = Readonly<{ headers: Headers; did: string; pages: number; fetchedAt: number }>;

const signIn = (credential: Credential): Effect.Effect<typeof Session.Type, ProviderError> =>
  requireFields(credential, { identifier: FIELD.identifier, password: FIELD.appPassword }).pipe(
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
  }).pipe(Effect.map(followedBy({ subjectOf: followedOf, occurredAtOf: () => fetchedAt })));
};

export const pullBluesky = pullOf({
  provider: "bluesky",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* bluesky() {
      const session = yield* signIn(credential);
      const signed: Signed = {
        headers: { Authorization: `Bearer ${session.accessJwt}` },
        did: session.did,
        pages: pages,
        fetchedAt,
      };
      return [...(yield* pullLikes(signed)), ...(yield* pullFollows(signed))];
    }),
});
