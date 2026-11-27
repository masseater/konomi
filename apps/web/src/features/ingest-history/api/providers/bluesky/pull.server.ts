import { Effect, Option, pipe } from "effect";

import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { collectObserved } from "#/features/ingest-history/api/providers/observed-pages.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { LIMIT, SERVICE } from "./api";
import { Follows, Likes } from "./schemas";
import { signIn } from "./sign-in.server";
import { followedOf, postOf } from "./subjects";

type Signed = Readonly<{ headers: Headers; did: string; pages: number; fetchedAt: number }>;

const pageUrl = (method: string, did: string): string =>
  `${SERVICE}/${method}?actor=${encodeURIComponent(did)}&limit=${LIMIT}`;

const withCursor =
  (first: string) =>
  (cursor: string | null | undefined): Option.Option<string> =>
    pipe(
      Option.fromNullishOr(cursor),
      Option.map((value) => `${first}&cursor=${encodeURIComponent(value)}`),
    );

const pullLikes = ({ headers, did, pages, fetchedAt }: Signed): Observing => {
  const first = pageUrl("app.bsky.feed.getActorLikes", did);
  return collectObserved({
    kind: "endorsed",
    first,
    pages,
    fetchedAt,
    headers,
    schema: Likes,
    pageOf: ({ feed, cursor }) => ({ items: feed, next: withCursor(first)(cursor) }),
    subjectOf: ({ post }) => postOf(post),
  });
};

const pullFollows = ({ headers, did, pages, fetchedAt }: Signed): Observing => {
  const first = pageUrl("app.bsky.graph.getFollows", did);
  return collectObserved({
    kind: "followed",
    first,
    pages,
    fetchedAt,
    headers,
    schema: Follows,
    pageOf: ({ follows, cursor }) => ({ items: follows, next: withCursor(first)(cursor) }),
    subjectOf: followedOf,
  });
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
        pages,
        fetchedAt,
      };
      return [...(yield* pullLikes(signed)), ...(yield* pullFollows(signed))];
    }),
});
