import { Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import { bearerOf, requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { instanceOriginOf } from "#/features/ingest-history/api/providers/instance-origin";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import type { Fetched, Observer } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { FIELD, LIMIT } from "./api.ts";
import { Favorites, Following, Me, Reactions, Request } from "./schemas.ts";
import { followedOf, noteOf } from "./subjects.ts";

const call =
  (origin: string, path: string, userId: Option.Option<string>) =>
  <Item>({
    headers,
    schema,
  }: Readonly<{ headers: Headers; schema: Schema.Decoder<Item> }>): Fetched<Item> =>
    fetchJson({
      url: `${origin}/api/${path}`,
      headers,
      schema,
      post: {
        payload: Request,
        value: {
          limit: LIMIT,
          ...pipe(
            userId,
            Option.map((id) => ({ userId: id })),
            Option.getOrElse(() => ({})),
          ),
        },
      },
    });

const listingsOf = (origin: string, id: string): readonly Listing[] => {
  const none = Option.none<string>();
  const mine = Option.some(id);
  const collected: Observer<(typeof Favorites.Type)[number]> = datedObservationsOf({
    kind: "collected",
    subjectOf: ({ note }) => Option.some(noteOf(origin)(note)),
    occurredAtOf: ({ createdAt }) => createdAt,
  });
  const endorsed: Observer<(typeof Reactions.Type)[number]> = datedObservationsOf({
    kind: "endorsed",
    subjectOf: ({ note }) => Option.some(noteOf(origin)(note)),
    occurredAtOf: ({ createdAt }) => createdAt,
  });
  const followed: Observer<(typeof Following.Type)[number]> = datedObservationsOf({
    kind: "followed",
    subjectOf: ({ followee }) =>
      pipe(Option.fromNullishOr(followee), Option.map(followedOf(origin))),
    occurredAtOf: ({ createdAt }) => createdAt,
  });
  const favoritesListing = listingOf({
    label: "i/favorites",
    source: sourceOf({
      first: "i/favorites",
      schema: Favorites,
      fetch: call(origin, "i/favorites", none),
      items: (items) => items,
    }),
  })(collected);
  const reactionsListing = listingOf({
    label: "users/reactions",
    source: sourceOf({
      first: "users/reactions",
      schema: Reactions,
      fetch: call(origin, "users/reactions", mine),
      items: (items) => items,
    }),
  })(endorsed);
  const followingListing = listingOf({
    label: "users/following",
    source: sourceOf({
      first: "users/following",
      schema: Following,
      fetch: call(origin, "users/following", mine),
      items: (items) => items,
    }),
  })(followed);
  return [favoritesListing, reactionsListing, followingListing];
};

export const pullMisskey = pullOf({
  provider: "misskey",
  cursor: "kept",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* misskey() {
      const origin = yield* instanceOriginOf(FIELD.instance)(credential);
      const token = yield* requireField(credential, FIELD.accessToken);
      const headers = bearerOf(token);
      const { id } = yield* call(origin, "i", Option.none())({ headers, schema: Me });
      const listings = pulledListings(listingsOf(origin, id));
      return yield* listings({ headers, pages, fetchedAt });
    }),
});
