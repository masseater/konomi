import { Array as Arr, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { listEntryObservationsOf } from "#/features/ingest-history/api/providers/observe";
import {
  orEmpty,
  seriesOrBook,
  subjectIn,
  textTagsOf,
} from "#/features/ingest-history/api/providers/subject-in";

import type { AniListEntry, AniListMedia } from "./schemas";

const MS_PER_SECOND = 1000;
const LIKED_SCORE = 80;
const STATUS_LABEL: Readonly<Record<string, string>> = {
  CURRENT: "見てる・読んでる",
  PLANNING: "見たい・読みたい",
  COMPLETED: "見た・読んだ",
  DROPPED: "やめた",
  PAUSED: "止めている",
  REPEATING: "繰り返している",
};

const titleOf = ({ title, id }: AniListMedia): string =>
  pipe(
    [title.native, title.romaji, title.english],
    Arr.map(Option.fromNullishOr),
    Arr.getSomes,
    Arr.head,
    Option.getOrElse(() => String(id)),
  );

const mediaOf = (media: AniListMedia): SubjectInput =>
  subjectIn("anilist")({
    externalId: `${media.type}:${media.id}`,
    type: seriesOrBook(media.type === "ANIME"),
    title: titleOf(media),
    url: media.siteUrl,
    tags: [...orEmpty(media.genres), ...textTagsOf(media.seasonYear)],
  });

export const entryObservationsOf =
  (fetchedAt: number) =>
  (entry: AniListEntry): readonly Observation[] => {
    const subject = mediaOf(entry.media);
    const occurredAtMs = pipe(
      Option.fromNullishOr(entry.updatedAt),
      Option.map((seconds) => seconds * MS_PER_SECOND),
      Option.getOrElse(() => fetchedAt),
    );
    return listEntryObservationsOf({
      subject,
      occurredAtMs,
      context: Option.fromUndefinedOr(STATUS_LABEL[entry.status]),
      score: Option.fromNullishOr(entry.score),
      likedFrom: LIKED_SCORE,
      completed: entry.status === "COMPLETED",
    });
  };
