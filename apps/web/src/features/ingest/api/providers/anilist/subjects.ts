import { Array as Arr, Match, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";

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

const mediaOf = (media: AniListMedia): SubjectInput => ({
  provider: "anilist",
  externalId: `${media.type}:${media.id}`,
  type: Match.value(media.type).pipe(
    Match.when("ANIME", () => "series" as const),
    Match.orElse(() => "book" as const),
  ),
  title: titleOf(media),
  url: media.siteUrl,
  credits: [],
  tags: [
    ...pipe(
      Option.fromNullishOr(media.genres),
      Option.getOrElse((): readonly string[] => []),
    ),
    ...pipe(Option.fromNullishOr(media.seasonYear), Option.map(String), Option.toArray),
  ],
});

const entryObservationsOf =
  (fetchedAt: number) =>
  (entry: AniListEntry): readonly Observation[] => {
    const subject = mediaOf(entry.media);
    const occurredAtMs = pipe(
      Option.fromNullishOr(entry.updatedAt),
      Option.map((seconds) => seconds * MS_PER_SECOND),
      Option.getOrElse(() => fetchedAt),
    );
    const collected: Observation = {
      kind: "collected",
      subject,
      occurredAtMs,
      ...pipe(
        Option.fromUndefinedOr(STATUS_LABEL[entry.status]),
        Option.map((context) => ({ context })),
        Option.getOrElse(() => ({})),
      ),
    };
    const liked = pipe(
      Option.fromNullishOr(entry.score),
      Option.filter((score) => score >= LIKED_SCORE),
      Option.map((): Observation => ({ kind: "endorsed", subject, occurredAtMs })),
      Option.toArray,
    );
    const completed = pipe(
      Option.liftPredicate(entry.status, (status: string) => status === "COMPLETED"),
      Option.map((): Observation => ({ kind: "consumed", subject, occurredAtMs })),
      Option.toArray,
    );
    return [collected, ...liked, ...completed];
  };

export { entryObservationsOf, mediaOf };
