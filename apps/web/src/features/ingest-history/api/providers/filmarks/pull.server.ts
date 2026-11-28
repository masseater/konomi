import { Array as Arr, Effect, Option, pipe } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { fetchText } from "#/features/ingest-history/api/providers/http.server";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { FIELD, HEADERS, WEB } from "./api.ts";
import { clipCardsOf, markCardsOf } from "./cards.ts";
import type { Card } from "./cards.ts";
import { clipObservationOf, markObservationsOf } from "./subjects.ts";

type Read = (html: string) => Readonly<{ cards: readonly Card[]; next: Option.Option<string> }>;

const collectCards =
  ({ pages, read }: Readonly<{ pages: number; read: Read }>) =>
  (path: string): Effect.Effect<readonly Card[], ProviderError> =>
    collectPages({
      first: `${WEB}${path}`,
      pages,
      fetchPage: (url) =>
        fetchText({ url, headers: HEADERS }).pipe(
          Effect.map(read),
          Effect.map(({ cards, next }) => ({
            items: cards,
            next: pipe(
              next,
              Option.map((href) => `${WEB}${href}`),
            ),
          })),
        ),
    });

export const pullFilmarks = pullOf({
  provider: "filmarks",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* filmarks() {
      const name = yield* requireField(credential, FIELD.user);
      const user = encodeURIComponent(name);
      const marks = collectCards({ pages, read: markCardsOf });
      const movies = yield* marks(`/users/${user}`);
      const dramas = yield* marks(`/users/${user}/marks/dramas`);
      const clips = yield* collectCards({ pages, read: clipCardsOf })(`/users/${user}/clips`);
      return [
        ...pipe([...movies, ...dramas], Arr.flatMap(markObservationsOf(fetchedAt))),
        ...pipe(clips, Arr.map(clipObservationOf(fetchedAt))),
      ];
    }),
});
