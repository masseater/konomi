import { Array as Arr, Effect, Option, pipe } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import { urlWith } from "#/features/ingest-history/api/providers/url-with";

import { API, HEADERS, FIELD, LIMIT, LOVED } from "./api.ts";
import { Feedback, Listens } from "./schemas.ts";
import { listenObservationsOf, lovedObservationsOf } from "./subjects.ts";

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

export const pullListenbrainz = pullOf({
  provider: "listenbrainz",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* listenbrainz() {
      const name = yield* requireField(credential, FIELD.user);
      const user = encodeURIComponent(name);
      const listings = pulledListings([
        listingOf({
          label: "listens",
          source: sourceOf({
            first: `${API}/user/${user}/listens?count=${LIMIT}`,
            schema: Listens,
          })(({ payload: { listens } }, url) => ({
            items: listens,
            next: pipe(
              Arr.last(listens),
              Option.flatMap(({ listened_at: listenedAt }) =>
                fullPageNext({ url, items: listens })({
                  name: "max_ts",
                  value: String(listenedAt),
                }),
              ),
            ),
          })),
        })(() => listenObservationsOf),
        listingOf({
          label: "loved",
          source: sourceOf({
            first: `${API}/feedback/user/${user}/get-feedback?score=${LOVED}&count=${LIMIT}&metadata=true&${OFFSET}=0`,
            schema: Feedback,
          })(({ feedback }, url) => ({
            items: feedback,
            next: fullPageNext({ url, items: feedback })({
              name: OFFSET,
              value: nextOffset(url),
            }),
          })),
        })(() => lovedObservationsOf),
      ]);
      return yield* listings({ headers: HEADERS, pages, fetchedAt });
    }),
});
