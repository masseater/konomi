import { Array as Arr, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { presentObservationsOf } from "#/features/ingest-history/api/providers/observe";

export type LibraryEntry = Readonly<{
  subject: SubjectInput;
  collectedAtMs: number;
  lastPlayedAtMs: Option.Option<number>;
}>;

const consumedOf = presentObservationsOf("consumed")(({ subject, lastPlayedAtMs }: LibraryEntry) =>
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
  <Game>(entryOf: (game: Game) => Option.Option<LibraryEntry>) =>
  (games: readonly Game[]): readonly Observation[] =>
    pipe(
      games,
      Arr.flatMap((game) => pipe(entryOf(game), Option.toArray, Arr.flatMap(observationsAround))),
    );
