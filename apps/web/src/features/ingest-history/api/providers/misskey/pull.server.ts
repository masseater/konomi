import { Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import { bearerOf, requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { instanceOriginOf } from "#/features/ingest-history/api/providers/instance-origin";
import {
  flatListing,
  pulledListings,
} from "#/features/ingest-history/api/providers/listing.server";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import type { Fetched } from "#/features/ingest-history/api/providers/observe";
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

export const pullMisskey = pullOf({
  provider: "misskey",
  cursor: "kept",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* misskey() {
      const origin = yield* instanceOriginOf(FIELD.instance)(credential);
      const token = yield* requireField(credential, FIELD.accessToken);
      const headers = bearerOf(token);
      const { id } = yield* call(origin, "i", Option.none())({ headers, schema: Me });
      const none = Option.none<string>();
      const mine = Option.some(id);
      const listings = pulledListings([
        flatListing({
          label: "i/favorites",
          first: "i/favorites",
          schema: Favorites,
          fetch: call(origin, "i/favorites", none),
        })(
          datedObservationsOf({
            kind: "collected",
            subjectOf: ({ note }) => Option.some(noteOf(origin)(note)),
            occurredAtOf: ({ createdAt }) => createdAt,
          }),
        ),
        flatListing({
          label: "users/reactions",
          first: "users/reactions",
          schema: Reactions,
          fetch: call(origin, "users/reactions", mine),
        })(
          datedObservationsOf({
            kind: "endorsed",
            subjectOf: ({ note }) => Option.some(noteOf(origin)(note)),
            occurredAtOf: ({ createdAt }) => createdAt,
          }),
        ),
        flatListing({
          label: "users/following",
          first: "users/following",
          schema: Following,
          fetch: call(origin, "users/following", mine),
        })(
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
