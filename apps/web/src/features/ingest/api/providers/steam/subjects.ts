import { Array as Arr, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";

import { STORE } from "./api";
import type { SteamGame } from "./schemas";

const MS_PER_SECOND = 1000;
const NEVER_PLAYED = 0;

const gameOf = (game: SteamGame): Option.Option<SubjectInput> =>
  pipe(
    Option.fromNullishOr(game.name),
    Option.map((title) => ({
      provider: "steam" as const,
      externalId: String(game.appid),
      type: "game" as const,
      title,
      url: `${STORE}/app/${game.appid}`,
      credits: [],
      tags: [],
    })),
  );

const lastPlayedOf = (game: SteamGame): Option.Option<number> =>
  pipe(
    Option.fromNullishOr(game.rtime_last_played),
    Option.filter((seconds) => seconds > NEVER_PLAYED),
    Option.map((seconds) => seconds * MS_PER_SECOND),
  );

const observationsOf =
  (fetchedAt: number) =>
  (game: SteamGame): readonly Observation[] =>
    pipe(
      gameOf(game),
      Option.map((subject): readonly Observation[] => [
        { kind: "collected", subject, occurredAtMs: fetchedAt },
        ...pipe(
          lastPlayedOf(game),
          Option.map((occurredAtMs): Observation => ({ kind: "consumed", subject, occurredAtMs })),
          Option.toArray,
        ),
      ]),
      Option.getOrElse((): readonly Observation[] => []),
    );

const gamesObservedAt =
  (fetchedAt: number) =>
  (games: readonly SteamGame[]): readonly Observation[] =>
    pipe(games, Arr.flatMap(observationsOf(fetchedAt)));

export { gamesObservedAt };
