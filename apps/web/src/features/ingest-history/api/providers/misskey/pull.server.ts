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
import { datedObservationsOf, pageOf } from "#/features/ingest-history/api/providers/observe";
import type { Fetched, Observer } from "#/features/ingest-history/api/providers/observe";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { FIELD, LIMIT } from "./api.ts";
import { Favorites, Following, Me, Reactions, Request } from "./schemas.ts";
import { followedOf, notedAs } from "./subjects.ts";

const call =
  (origin: string, headers: Headers) =>
  <Item>(
    path: string,
    schema: Schema.Decoder<Item>,
    userId: Option.Option<string>,
  ): Fetched<Item> =>
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

const listingAt =
  <Item>({
    origin,
    path,
    userId,
    schema,
  }: Readonly<{
    origin: string;
    path: string;
    userId: Option.Option<string>;
    schema: Schema.Decoder<readonly Item[]>;
  }>) =>
  (observe: Observer<Item>): Listing =>
    listingOf({
      label: path,
      source: sourceOf({
        first: path,
        schema,
        fetch: ({ headers, schema: decoder }) => call(origin, headers)(path, decoder, userId),
      })((items) => pageOf({ items })),
    })(observe);

export const pullMisskey = pullOf({
  provider: "misskey",
  cursor: "kept",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* misskey() {
      const origin = yield* instanceOriginOf(FIELD.instance)(credential);
      const token = yield* requireField(credential, FIELD.accessToken);
      const headers = bearerOf(token);
      const { id } = yield* call(origin, headers)("i", Me, Option.none());
      const none = Option.none<string>();
      const mine = Option.some(id);
      const listings = pulledListings([
        listingAt({ origin, path: "i/favorites", userId: none, schema: Favorites })(
          notedAs({ kind: "collected", origin }),
        ),
        listingAt({ origin, path: "users/reactions", userId: mine, schema: Reactions })(
          notedAs({ kind: "endorsed", origin }),
        ),
        listingAt({ origin, path: "users/following", userId: mine, schema: Following })(
          datedObservationsOf({
            kind: "followed",
            subjectOf: ({ followee }) =>
              pipe(Option.fromNullishOr(followee), Option.map(followedOf(origin))),
            occurredAtOf: ({ createdAt }) => createdAt,
          }),
        ),
      ]);
      return yield* listings({ headers, pages, fetchedAt });
    }),
});
