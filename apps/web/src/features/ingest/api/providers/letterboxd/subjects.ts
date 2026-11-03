import { Array as Arr, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest/api/providers/observe";

import { LIKED, LIKED_RATING, WEB } from "./api";
import type { LetterboxdEntry } from "./schemas";

const FILM_SLUG = /\/film\/(?<slug>[^/]+)\//u;

const slugOf = (link: string): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(FILM_SLUG.exec(link)),
    Option.flatMap((match) => Option.fromNullishOr(match.groups)),
    Option.flatMap(({ slug }) => Option.fromNullishOr(slug)),
  );

const filmOf = (entry: LetterboxdEntry): Option.Option<SubjectInput> =>
  pipe(
    Option.all({
      title: Option.fromUndefinedOr(entry["letterboxd:filmTitle"]),
      slug: slugOf(entry.link),
    }),
    Option.map(({ title, slug }) => ({
      provider: "letterboxd" as const,
      externalId: slug,
      type: "movie" as const,
      title,
      url: `${WEB}/film/${slug}/`,
      credits: [],
      tags: Option.toArray(Option.fromUndefinedOr(entry["letterboxd:filmYear"])),
    })),
  );

const likedOf = (entry: LetterboxdEntry): boolean =>
  entry["letterboxd:memberLike"] === LIKED ||
  pipe(
    Option.fromUndefinedOr(entry["letterboxd:memberRating"]),
    Option.map(Number),
    Option.exists((rating) => rating >= LIKED_RATING),
  );

type At = (text: string | undefined) => number;

const watchedAtOf = (entry: LetterboxdEntry): string | undefined =>
  pipe(
    Option.fromUndefinedOr(entry["letterboxd:watchedDate"]),
    Option.orElse(() => Option.fromUndefinedOr(entry.pubDate)),
    Option.getOrUndefined,
  );

const observationsFor =
  ({ entry, at }: Readonly<{ entry: LetterboxdEntry; at: At }>) =>
  (subject: SubjectInput): readonly Observation[] => {
    const watched: Observation = {
      kind: "consumed",
      subject,
      occurredAtMs: at(watchedAtOf(entry)),
    };
    const liked: Observation = { kind: "endorsed", subject, occurredAtMs: at(entry.pubDate) };
    return Arr.filter([watched, liked], ({ kind }) => kind === "consumed" || likedOf(entry));
  };

const letterboxdObservationsOf =
  (fetchedAt: number) =>
  (entries: readonly LetterboxdEntry[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    return pipe(
      entries,
      Arr.flatMap((entry) =>
        pipe(
          filmOf(entry),
          Option.map(observationsFor({ entry, at })),
          Option.getOrElse(() => []),
        ),
      ),
    );
  };

export { letterboxdObservationsOf };
