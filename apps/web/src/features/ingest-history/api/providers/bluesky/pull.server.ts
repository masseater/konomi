import { Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import type { SubjectInput } from "#/entities/signal";
import { bearerOf } from "#/features/ingest-history/api/providers/credential-field";
import {
  jsonListing,
  pulledListings,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { SignalKind } from "#/shared/config";

import { LIMIT, SERVICE } from "./api.ts";
import { Follows, Likes } from "./schemas.ts";
import { signIn } from "./sign-in.server.ts";
import { followedOf, postOf } from "./subjects.ts";

const pageUrl = (method: string, did: string): string =>
  `${SERVICE}/${method}?actor=${encodeURIComponent(did)}&limit=${LIMIT}`;

const withCursor =
  (first: string) =>
  (cursor: string | null | undefined): Option.Option<string> =>
    pipe(
      Option.fromNullishOr(cursor),
      Option.map((value) => `${first}&cursor=${encodeURIComponent(value)}`),
    );

const cursoredListing =
  <
    Body extends Schema.Top &
      Readonly<{
        DecodingServices: never;
        Type: Readonly<{ cursor?: string | null | undefined }>;
      }>,
    Item,
  >({
    method,
    kind,
    schema,
    itemsOf,
    subjectOf,
  }: Readonly<{
    method: string;
    kind: SignalKind;
    schema: Body;
    itemsOf: (body: Body["Type"]) => readonly Item[];
    subjectOf: (item: Item) => Option.Option<SubjectInput>;
  }>) =>
  (did: string): Listing => {
    const first = pageUrl(method, did);
    return jsonListing({
      kind,
      first,
      schema,
      pageOf: (body) => ({ items: itemsOf(body), next: withCursor(first)(body.cursor) }),
      subjectOf,
    });
  };

const likesOf = cursoredListing({
  method: "app.bsky.feed.getActorLikes",
  kind: "endorsed",
  schema: Likes,
  itemsOf: ({ feed }) => feed,
  subjectOf: ({ post }) => Option.some(postOf(post)),
});

const followsOf = cursoredListing({
  method: "app.bsky.graph.getFollows",
  kind: "followed",
  schema: Follows,
  itemsOf: ({ follows }) => follows,
  subjectOf: (followed) => Option.some(followedOf(followed)),
});

export const pullBluesky = pullOf({
  provider: "bluesky",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    signIn(credential).pipe(
      Effect.flatMap(({ accessJwt, did }) =>
        pulledListings([likesOf(did), followsOf(did)])({
          headers: bearerOf(accessJwt),
          pages,
          fetchedAt,
        }),
      ),
    ),
});
