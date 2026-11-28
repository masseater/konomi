import { Option } from "effect";
import type { UserPlayedGamesResponse } from "psn-api";

import type { SubjectInput } from "#/entities/signal";
import { libraryObservationsOf } from "#/features/ingest-history/api/providers/library-observations";
import { epochOr } from "#/features/ingest-history/api/providers/observe";

import { STORE } from "./api.ts";

export type PlayedGame = Readonly<
  Pick<
    UserPlayedGamesResponse["titles"][number],
    "localizedName" | "firstPlayedDateTime" | "lastPlayedDateTime"
  > & {
    concept: Readonly<Pick<UserPlayedGamesResponse["titles"][number]["concept"], "id">>;
  }
>;

const gameOf = (game: PlayedGame): SubjectInput => ({
  provider: "playstation",
  externalId: String(game.concept.id),
  type: "game",
  title: game.localizedName,
  url: `${STORE}/concept/${game.concept.id}`,
  credits: [],
  tags: [],
});

export const playedObservationsOf = libraryObservationsOf({
  subjectOf: (game: PlayedGame) => Option.some(gameOf(game)),
  collectedAtOf: (game: PlayedGame, fetchedAt: number): number =>
    epochOr(fetchedAt)(game.firstPlayedDateTime),
  lastPlayedAtOf: (game: PlayedGame, fetchedAt: number) =>
    Option.some(epochOr(fetchedAt)(game.lastPlayedDateTime)),
});
