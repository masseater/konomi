import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest-history/api/providers/observe";
import { subjectIn, textTagsOf } from "#/features/ingest-history/api/providers/subject-in";

import { WEB } from "./api.ts";
import type { AnnictEntry, AnnictRecord, AnnictWork } from "./schemas.ts";

const SEPARATOR = " ";
const LIKED_RATINGS: ReadonlySet<string> = new Set(["GOOD", "GREAT"]);
const STATE_LABEL: Readonly<Record<string, string>> = { WATCHING: "見てる", WATCHED: "見た" };

const seasonTagsOf = (work: AnnictWork): readonly string[] => textTagsOf(work.seasonYear);

const annict = subjectIn("annict");

const subjectOf = ({
  work,
  episode,
}: Readonly<{
  work: AnnictWork;
  episode: Option.Option<AnnictRecord["episode"]>;
}>): SubjectInput => {
  const workPath = `/works/${work.annictId}`;
  const entity = pipe(
    episode,
    Option.match({
      onNone: () => ({
        externalId: `work:${work.annictId}`,
        type: "series" as const,
        titleParts: [Option.some(work.title)],
        path: workPath,
        tags: seasonTagsOf(work),
      }),
      onSome: (found) => ({
        externalId: `episode:${found.annictId}`,
        type: "episode" as const,
        titleParts: [
          Option.some(work.title),
          Option.fromNullishOr(found.numberText),
          Option.fromNullishOr(found.title),
        ],
        path: `${workPath}/episodes/${found.annictId}`,
        tags: [work.title, ...seasonTagsOf(work)],
      }),
    }),
  );
  return annict({
    externalId: entity.externalId,
    type: entity.type,
    title: pipe(entity.titleParts, Arr.getSomes, Arr.filter(Str.isNonEmpty), Arr.join(SEPARATOR)),
    url: `${WEB}${entity.path}`,
    tags: entity.tags,
  });
};

export const recordObservationsOf =
  (fetchedAt: number) =>
  (record: AnnictRecord): readonly Observation[] => {
    const subject = subjectOf({ work: record.work, episode: Option.some(record.episode) });
    const occurredAtMs = epochOr(fetchedAt)(record.createdAt);
    const liked = pipe(
      Option.fromNullishOr(record.ratingState),
      Option.filter((rating) => LIKED_RATINGS.has(rating)),
      Option.map((): Observation => ({ kind: "endorsed", subject, occurredAtMs })),
      Option.toArray,
    );
    return [{ kind: "consumed", subject, occurredAtMs }, ...liked];
  };

export const entryObservationsOf =
  (fetchedAt: number) =>
  (entry: AnnictEntry): readonly Observation[] =>
    pipe(
      Option.fromNullishOr(entry.status),
      Option.flatMap((status) =>
        pipe(
          Option.fromUndefinedOr(STATE_LABEL[status.state]),
          Option.map((context): Observation => ({
            kind: "collected",
            subject: subjectOf({ work: entry.work, episode: Option.none() }),
            occurredAtMs: epochOr(fetchedAt)(status.createdAt),
            context,
          })),
        ),
      ),
      Option.toArray,
    );
