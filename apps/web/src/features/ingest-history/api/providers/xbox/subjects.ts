import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, Observation } from "#/entities/signal";
import {
  creatorFrom,
  withoutRelations,
} from "#/features/ingest-history/api/providers/creator-input";

import { GAME, WEB } from "./api.ts";
import type { XboxPerson, XboxTitle } from "./schemas.ts";

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

export const playedObservationsOf = (titles: readonly XboxTitle[]): readonly Observation[] =>
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

const friendOf: (person: XboxPerson) => CreatorInput = creatorFrom({ provider: "xbox" })({
  externalId: ({ xuid }) => `user:${xuid}`,
  title: ({ gamertag }) => gamertag,
  url: ({ gamertag }) => `${WEB}/play/user/${encodeURIComponent(gamertag)}`,
});

export const friendObservationsOf =
  (fetchedAt: number) =>
  (people: readonly XboxPerson[]): readonly Observation[] =>
    pipe(
      people,
      Arr.map((person) => ({
        kind: "followed" as const,
        occurredAtMs: fetchedAt,
        subject: withoutRelations(friendOf(person)),
      })),
    );
