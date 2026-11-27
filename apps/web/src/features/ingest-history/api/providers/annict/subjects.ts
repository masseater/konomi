import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest-history/api/providers/observe";
import { subjectIn, textTagsOf } from "#/features/ingest-history/api/providers/subject-in";

import { WEB } from "./api";
import type { AnnictEntry, AnnictRecord, AnnictWork } from "./schemas";

const SEPARATOR = " ";
const LIKED_RATINGS: ReadonlySet<string> = new Set(["GOOD", "GREAT"]);
const STATE_LABEL: Readonly<Record<string, string>> = { WATCHING: "見てる", WATCHED: "見た" };

const seasonTagsOf = (work: AnnictWork): readonly string[] => textTagsOf(work.seasonYear);

const annict = subjectIn("annict");

const workOf = (work: AnnictWork): SubjectInput =>
  annict({
    externalId: `work:${work.annictId}`,
    type: "series",
    title: work.title,
    url: `${WEB}/works/${work.annictId}`,
    tags: seasonTagsOf(work),
  });

const episodeOf = ({ episode, work }: AnnictRecord): SubjectInput =>
  annict({
    externalId: `episode:${episode.annictId}`,
    type: "episode",
    title: pipe(
      [
        Option.some(work.title),
        Option.fromNullishOr(episode.numberText),
        Option.fromNullishOr(episode.title),
      ],
      Arr.getSomes,
      Arr.filter(Str.isNonEmpty),
      Arr.join(SEPARATOR),
    ),
    url: `${WEB}/works/${work.annictId}/episodes/${episode.annictId}`,
    tags: [work.title, ...seasonTagsOf(work)],
  });

export const recordObservationsOf =
  (fetchedAt: number) =>
  (record: AnnictRecord): readonly Observation[] => {
    const subject = episodeOf(record);
    const occurredAtMs = epochOr(fetchedAt)(record.createdAt);
    const liked = pipe(
      Option.fromNullishOr(record.ratingState),
      Option.filter((rating) => LIKED_RATINGS.has(rating)),
      Option.map((): Observation => ({ kind: "endorsed", subject, occurredAtMs })),
      Option.toArray,
    );
    return [{ kind: "consumed", subject, occurredAtMs }, ...liked];
  };

export const entryObservationOf =
  (fetchedAt: number) =>
  (entry: AnnictEntry): Option.Option<Observation> =>
    pipe(
      Option.fromNullishOr(entry.status),
      Option.flatMap((status) =>
        pipe(
          Option.fromUndefinedOr(STATE_LABEL[status.state]),
          Option.map((context): Observation => ({
            kind: "collected",
            subject: workOf(entry.work),
            occurredAtMs: epochOr(fetchedAt)(status.createdAt),
            context,
          })),
        ),
      ),
    );
