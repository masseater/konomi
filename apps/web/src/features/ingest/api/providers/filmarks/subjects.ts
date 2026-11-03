import { Array as Arr, Match, Option, String as Str, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import type { SubjectType } from "#/shared/config";

import { LIKED_SCORE, WANTED, WATCHED, WEB } from "./api";
import type { Card } from "./cards";

const PRODUCED_YEAR = /(?<year>\d{4})年製作/u;
const SEPARATOR = "/";

const typeOf = (path: string): SubjectType =>
  Match.value(Str.startsWith("/movies/")(path)).pipe(
    Match.when(true, (): SubjectType => "movie"),
    Match.orElse((): SubjectType => "series"),
  );

const yearOf = (label: string): readonly string[] =>
  pipe(
    Option.fromNullishOr(PRODUCED_YEAR.exec(label)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap(({ year }) => Option.fromNullishOr(year)),
    Option.toArray,
  );

const workOf = (card: Card): SubjectInput => ({
  provider: "filmarks",
  externalId: pipe(
    Str.split(card.path, SEPARATOR),
    Arr.filter(Str.isNonEmpty),
    Arr.join(SEPARATOR),
  ),
  type: typeOf(card.path),
  title: card.title,
  url: `${WEB}${card.path}`,
  credits: [],
  tags: yearOf(card.label),
});

const markObservationsOf =
  (fetchedAt: number) =>
  (card: Card): readonly Observation[] => {
    const subject = workOf(card);
    const watched: Observation = {
      kind: "collected",
      subject,
      occurredAtMs: fetchedAt,
      context: WATCHED,
    };
    const liked: Observation = { kind: "endorsed", subject, occurredAtMs: fetchedAt };
    return Arr.filter(
      [watched, liked],
      ({ kind }) =>
        kind === "collected" || Option.exists(card.score, (score) => score >= LIKED_SCORE),
    );
  };

const clipObservationOf =
  (fetchedAt: number) =>
  (card: Card): Observation => ({
    kind: "collected",
    subject: workOf(card),
    occurredAtMs: fetchedAt,
    context: WANTED,
  });

export { clipObservationOf, markObservationsOf };
