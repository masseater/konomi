import { Array as Arr, Option, pipe } from "effect";
import type { UserPlayedGamesResponse } from "psn-api";

import type { Observation, SubjectInput } from "#/entities/signal";
import {
  epochOr,
  libraryEntryObservationsOf,
} from "#/features/ingest-history/api/providers/observe";

import { STORE } from "./api";

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

export const playedObservationsOf =
  (fetchedAt: number) =>
  (games: readonly PlayedGame[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    return pipe(
      games,
      Arr.flatMap((game) =>
        libraryEntryObservationsOf({
          subject: gameOf(game),
          collectedAtMs: at(game.firstPlayedDateTime),
          lastPlayedAtMs: Option.some(at(game.lastPlayedDateTime)),
        }),
      ),
    );
  };
