import { Array as Arr, Option, pipe } from "effect";

import type { SubjectInput } from "#/entities/signal";
import { listEntriesOf } from "#/features/ingest-history/api/providers/observe";
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

export const entryObservationsOf = listEntriesOf<AniListEntry>({
  subjectOf: ({ media }) => mediaOf(media),
  occurredAtOf: ({ updatedAt }) =>
    pipe(
      Option.fromNullishOr(updatedAt),
      Option.map((seconds) => seconds * MS_PER_SECOND),
    ),
  statusOf: ({ status }) => status,
  labels: STATUS_LABEL,
  scoreOf: ({ score }) => score,
  likedFrom: LIKED_SCORE,
  completedStatus: "COMPLETED",
});
