import { Effect } from "effect";

import { bearerOf } from "#/features/ingest-history/api/providers/credential-field";
import { pulledListings } from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { followsOf, likesOf } from "./listings.ts";
import { signIn } from "./sign-in.server.ts";

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
