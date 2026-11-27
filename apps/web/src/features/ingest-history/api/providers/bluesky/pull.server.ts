import { Effect, Option, pipe } from "effect";

import {
  jsonListing,
  pulledListings,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { LIMIT, SERVICE } from "./api";
import { Follows, Likes } from "./schemas";
import { signIn } from "./sign-in.server";
import { followedOf, postOf } from "./subjects";

const pageUrl = (method: string, did: string): string =>
  `${SERVICE}/${method}?actor=${encodeURIComponent(did)}&limit=${LIMIT}`;

const withCursor =
  (first: string) =>
  (cursor: string | null | undefined): Option.Option<string> =>
    pipe(
      Option.fromNullishOr(cursor),
      Option.map((value) => `${first}&cursor=${encodeURIComponent(value)}`),
    );

const likesOf = (did: string): Listing => {
  const first = pageUrl("app.bsky.feed.getActorLikes", did);
  return jsonListing({
    kind: "endorsed",
    first,
    schema: Likes,
    pageOf: ({ feed, cursor }) => ({ items: feed, next: withCursor(first)(cursor) }),
    subjectOf: ({ post }) => Option.some(postOf(post)),
  });
};

const followsOf = (did: string): Listing => {
  const first = pageUrl("app.bsky.graph.getFollows", did);
  return jsonListing({
    kind: "followed",
    first,
    schema: Follows,
    pageOf: ({ follows, cursor }) => ({ items: follows, next: withCursor(first)(cursor) }),
    subjectOf: (followed) => Option.some(followedOf(followed)),
  });
};

export const pullBluesky = pullOf({
  provider: "bluesky",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    signIn(credential).pipe(
      Effect.flatMap(({ accessJwt, did }) =>
        pulledListings([likesOf(did), followsOf(did)])({
          headers: { Authorization: `Bearer ${accessJwt}` },
          pages,
          fetchedAt,
        }),
      ),
    ),
});
