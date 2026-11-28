import { Effect, Option, pipe } from "effect";
import { getUserPlayedGames } from "psn-api";

import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";
import { ProviderUnavailable } from "#/features/ingest-history/model/provider-unavailable";

import { LIMIT, ME } from "./api.ts";
import { playedObservationsOf } from "./subjects.ts";
import type { PlayedGame } from "./subjects.ts";
import { accessTokenOf } from "./tokens.server.ts";

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

export const pullPlaystation = pullOf({
  provider: "playstation",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* playstation() {
      const accessToken = yield* accessTokenOf(credential);
      const games = yield* collectPages({
        first: FIRST_OFFSET,
        pages,
        fetchPage: playedPage(accessToken),
      });
      return playedObservationsOf(fetchedAt)(games);
    }),
});
