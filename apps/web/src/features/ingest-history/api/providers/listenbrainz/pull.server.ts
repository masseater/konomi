import { Array as Arr, Effect, Option, pipe } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import {
  pagedListing,
  pulledListings,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import { urlWith } from "#/features/ingest-history/api/providers/url-with";

import { API, HEADERS, FIELD, LIMIT, LOVED } from "./api";
import { Feedback, Listens } from "./schemas";
import { listenObservationsOf, lovedObservationsOf } from "./subjects";

const OFFSET = "offset";

const fullPageNext =
  ({ url, items }: Readonly<{ url: string; items: readonly unknown[] }>) =>
  (param: Readonly<{ name: string; value: string }>): Option.Option<string> =>
    pipe(
      Option.liftPredicate(items.length, (count: number) => count >= LIMIT),
      Option.map(() => urlWith(url, { [param.name]: param.value })),
    );

const nextOffset = (url: string): string =>
  String(Number(new URL(url).searchParams.get(OFFSET)) + LIMIT);

const lovedListing = (user: string): Listing =>
  pagedListing({
    first: `${API}/feedback/user/${user}/get-feedback?score=${LOVED}&count=${LIMIT}&metadata=true&${OFFSET}=0`,
    schema: Feedback,
    pageOf: ({ feedback }, url) => ({
      items: feedback,
      next: fullPageNext({ url, items: feedback })({ name: OFFSET, value: nextOffset(url) }),
    }),
    observe: () => lovedObservationsOf,
  });

const listensListing = (user: string): Listing =>
  pagedListing({
    first: `${API}/user/${user}/listens?count=${LIMIT}`,
    schema: Listens,
    pageOf: ({ payload: { listens } }, url) => ({
      items: listens,
      next: pipe(
        Arr.last(listens),
        Option.flatMap(({ listened_at: listenedAt }) =>
          fullPageNext({ url, items: listens })({ name: "max_ts", value: String(listenedAt) }),
        ),
      ),
    }),
    observe: () => listenObservationsOf,
  });

export const pullListenbrainz = pullOf({
  provider: "listenbrainz",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* listenbrainz() {
      const name = yield* requireField(credential, FIELD.user);
      const user = encodeURIComponent(name);
      const listings = pulledListings([listensListing(user), lovedListing(user)]);
      return yield* listings({ headers: HEADERS, pages, fetchedAt });
    }),
});
