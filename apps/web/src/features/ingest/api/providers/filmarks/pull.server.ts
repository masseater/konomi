import { Array as Arr, Clock, Effect, Option, pipe } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { fetchText } from "#/features/ingest/api/providers/http.server";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { FIELD, HEADERS, WEB } from "./api";
import { clipCardsOf, markCardsOf } from "./cards";
import type { Card } from "./cards";
import { clipObservationOf, markObservationsOf } from "./subjects";

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

const pullFilmarks = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* filmarks() {
    const user = encodeURIComponent(yield* requireField(credential, FIELD.user));
    const fetchedAt = yield* Clock.currentTimeMillis;
    const pages = pagesOf(cursor);
    const marks = collectCards({ pages, read: markCardsOf });
    const movies = yield* marks(`/users/${user}`);
    const dramas = yield* marks(`/users/${user}/marks/dramas`);
    const clips = yield* collectCards({ pages, read: clipCardsOf })(`/users/${user}/clips`);
    return {
      observations: [
        ...pipe([...movies, ...dramas], Arr.flatMap(markObservationsOf(fetchedAt))),
        ...pipe(clips, Arr.map(clipObservationOf(fetchedAt))),
      ],
      cursor: yield* BACKFILLED,
    };
  }).pipe(Effect.withSpan("filmarks.pull"));

export { pullFilmarks };
