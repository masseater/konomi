import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { subjectTypeOf } from "#/features/ingest-history/api/providers/subject-fields";
import type { SubjectType } from "#/shared/config";

import { LIKED_SCORE, WANTED, WATCHED, WEB } from "./api.ts";
import type { Card } from "./cards.ts";

const PRODUCED_YEAR = /(?<year>\d{4})年製作/u;
const SEPARATOR = "/";
const SECTION = 1;

const typeOf = (path: string): SubjectType =>
  pipe(
    Str.split(path, SEPARATOR),
    Arr.get(SECTION),
    Option.getOrElse(() => ""),
    subjectTypeOf({ movies: "movie" }, "series"),
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

export const markObservationsOf =
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

export const clipObservationOf =
  (fetchedAt: number) =>
  (card: Card): Observation => ({
    kind: "collected",
    subject: workOf(card),
    occurredAtMs: fetchedAt,
    context: WANTED,
  });
