import { Option } from "effect";
import type { Schema } from "effect";

import type { SubjectInput } from "#/entities/signal";
import {
  cursorPageOf,
  listingOf,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import type { SignalKind } from "#/shared/config";

import { LIMIT, SERVICE } from "./api.ts";
import { Follows, Likes } from "./schemas.ts";
import { followedOf, postOf } from "./subjects.ts";

const pageUrl = (method: string, did: string): string =>
  `${SERVICE}/${method}?actor=${encodeURIComponent(did)}&limit=${LIMIT}`;

const cursoredListing =
  <Body extends Readonly<{ cursor?: string | null | undefined }>, Item>({
    method,
    kind,
    schema,
    itemsOf,
    subjectOf,
  }: Readonly<{
    method: string;
    kind: SignalKind;
    schema: Schema.Decoder<Body>;
    itemsOf: (body: Body) => readonly Item[];
    subjectOf: (item: Item) => Option.Option<SubjectInput>;
  }>) =>
  (did: string): Listing => {
    const source = sourceOf({ first: pageUrl(method, did), schema })(
      cursorPageOf({
        param: "cursor",
        itemsOf,
        cursorOf: ({ cursor }) => Option.fromNullishOr(cursor),
      }),
    );
    return listingOf({ label: method, source })(datedObservationsOf({ kind, subjectOf }));
  };

export const likesOf = cursoredListing({
  method: "app.bsky.feed.getActorLikes",
  kind: "endorsed",
  schema: Likes,
  itemsOf: ({ feed }) => feed,
  subjectOf: ({ post }) => Option.some(postOf(post)),
});

export const followsOf = cursoredListing({
  method: "app.bsky.graph.getFollows",
  kind: "followed",
  schema: Follows,
  itemsOf: ({ follows }) => follows,
  subjectOf: (followed) => Option.some(followedOf(followed)),
});
