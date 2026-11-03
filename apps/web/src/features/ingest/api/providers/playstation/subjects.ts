import { Array as Arr, pipe } from "effect";
import type { UserPlayedGamesResponse } from "psn-api";

import type { Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest/api/providers/observe";

import { STORE } from "./api";

type PlayedGame = Readonly<
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

const playedObservationsOf =
  (fetchedAt: number) =>
  (games: readonly PlayedGame[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    return pipe(
      games,
      Arr.flatMap((game): readonly Observation[] => {
        const subject = gameOf(game);
        return [
          { kind: "collected", subject, occurredAtMs: at(game.firstPlayedDateTime) },
          { kind: "consumed", subject, occurredAtMs: at(game.lastPlayedDateTime) },
        ];
      }),
    );
  };

export type { PlayedGame };
export { playedObservationsOf };
