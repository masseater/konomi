import { Array as Arr, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { observationsOf } from "#/features/ingest-history/api/providers/observe";

type LibraryEntry = Readonly<{
  subject: SubjectInput;
  collectedAtMs: number;
  lastPlayedAtMs: Option.Option<number>;
}>;

const consumedOf = observationsOf("consumed")(({ subject, lastPlayedAtMs }: LibraryEntry) =>
  pipe(
    lastPlayedAtMs,
    Option.map((occurredAtMs) => ({ occurredAtMs, subject })),
  ),
);

const observationsAround = (entry: LibraryEntry): readonly Observation[] =>
  Arr.prepend(consumedOf([entry]), {
    kind: "collected",
    subject: entry.subject,
    occurredAtMs: entry.collectedAtMs,
  });

export const libraryObservationsOf =
  <Game>({
    subjectOf,
    collectedAtOf,
    lastPlayedAtOf,
  }: Readonly<{
    subjectOf: (game: Game) => Option.Option<SubjectInput>;
    collectedAtOf: (game: Game, fetchedAt: number) => number;
    lastPlayedAtOf: (game: Game, fetchedAt: number) => Option.Option<number>;
  }>) =>
  (fetchedAt: number) =>
  (games: readonly Game[]): readonly Observation[] =>
    pipe(
      games,
      Arr.flatMap((game) =>
        pipe(
          subjectOf(game),
          Option.map((subject) => ({
            subject,
            collectedAtMs: collectedAtOf(game, fetchedAt),
            lastPlayedAtMs: lastPlayedAtOf(game, fetchedAt),
          })),
          Option.toArray,
          Arr.flatMap(observationsAround),
        ),
      ),
    );
