import { Array as Arr, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";

import { GAME, WEB } from "./api";
import type { XboxPerson, XboxTitle } from "./schemas";

const playedAtOf = (title: XboxTitle): Option.Option<number> =>
  pipe(
    Option.fromUndefinedOr(title.titleHistory),
    Option.flatMap(({ lastTimePlayed }) => Option.fromUndefinedOr(lastTimePlayed)),
    Option.map(Date.parse),
    Option.filter(Number.isFinite),
  );

const isGame = (title: XboxTitle): boolean =>
  pipe(
    Option.fromUndefinedOr(title.type),
    Option.match({ onNone: () => true, onSome: (type) => type === GAME }),
  );

const playedObservationsOf = (titles: readonly XboxTitle[]): readonly Observation[] =>
  pipe(
    titles,
    Arr.filter(isGame),
    Arr.flatMap((title) =>
      pipe(
        playedAtOf(title),
        Option.map((occurredAtMs) => ({
          kind: "consumed" as const,
          occurredAtMs,
          subject: {
            provider: "xbox" as const,
            externalId: `title:${title.titleId}`,
            type: "game" as const,
            title: title.name,
            url: `${WEB}/search?q=${encodeURIComponent(title.name)}`,
            credits: [],
            tags: [],
          },
        })),
        Option.toArray,
      ),
    ),
  );

const friendObservationsOf =
  (fetchedAt: number) =>
  (people: readonly XboxPerson[]): readonly Observation[] =>
    pipe(
      people,
      Arr.map(({ xuid, gamertag }) => ({
        kind: "followed" as const,
        occurredAtMs: fetchedAt,
        subject: {
          provider: "xbox" as const,
          externalId: `user:${xuid}`,
          type: "person" as const,
          title: gamertag,
          url: `${WEB}/play/user/${encodeURIComponent(gamertag)}`,
          credits: [],
          tags: [],
        },
      })),
    );

export { friendObservationsOf, playedObservationsOf };
