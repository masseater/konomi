import { Clock, Effect, Option, pipe } from "effect";
import { getUserPlayedGames } from "psn-api";

import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { collectPages } from "#/features/ingest/api/providers/paging.server";
import type { Page } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";
import { ProviderUnavailable } from "#/features/ingest/model/provider-unavailable";

import { LIMIT, ME } from "./api";
import { playedObservationsOf } from "./subjects";
import type { PlayedGame } from "./subjects";
import { accessTokenOf } from "./tokens.server";

const playedPage =
  (accessToken: string) =>
  (offset: string): Effect.Effect<Page<PlayedGame>, ProviderError> =>
    Effect.tryPromise({
      try: () => getUserPlayedGames({ accessToken }, ME, { limit: LIMIT, offset: Number(offset) }),
      catch: (cause) =>
        ProviderUnavailable.make({
          message: `PlayStation の遊んだゲームを読めなかった: ${String(cause)}`,
        }),
    }).pipe(
      Effect.map((played) => ({
        items: played.titles,
        next: pipe(
          Option.liftPredicate(played.nextOffset, (next: number) => next > Number(offset)),
          Option.map(String),
        ),
      })),
      Effect.withSpan("playstation.played-games", { attributes: { offset } }),
    );

const FIRST_OFFSET = "0";

const pullPlaystation = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* playstation() {
    const accessToken = yield* accessTokenOf(credential);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const games = yield* collectPages({
      first: FIRST_OFFSET,
      pages: pagesOf(cursor),
      fetchPage: playedPage(accessToken),
    });
    return { observations: playedObservationsOf(fetchedAt)(games), cursor: yield* BACKFILLED };
  }).pipe(Effect.withSpan("playstation.pull"));

export { pullPlaystation };
