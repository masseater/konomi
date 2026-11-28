import { Match, Option, pipe, Function as Fn } from "effect";

import type { SubjectInput } from "#/entities/signal";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import { subjectIn, textTagsOf } from "#/features/ingest-history/api/providers/subject-in";

import { WEB } from "./api.ts";
import type { TraktEpisode, TraktRated, TraktWatched, TraktWork } from "./schemas.ts";

const LIKED_RATING = 8;

const slugOf = (work: TraktWork): string =>
  pipe(
    Option.fromNullishOr(work.ids.slug),
    Option.getOrElse(() => String(work.ids.trakt)),
  );

const yearTagsOf = (work: TraktWork): readonly string[] => textTagsOf(work.year);

const trakt = subjectIn("trakt");

const workOf =
  ({ prefix, type, path }: Readonly<{ prefix: string; type: "movie" | "series"; path: string }>) =>
  (work: TraktWork): SubjectInput =>
    trakt({
      externalId: `${prefix}:${work.ids.trakt}`,
      type,
      title: work.title,
      url: `${WEB}/${path}/${slugOf(work)}`,
      tags: yearTagsOf(work),
    });

const movieOf = workOf({ prefix: "movie", type: "movie", path: "movies" });

const showOf = workOf({ prefix: "show", type: "series", path: "shows" });

const episodeOf = (show: TraktWork, episode: TraktEpisode): SubjectInput =>
  trakt({
    externalId: `episode:${episode.ids.trakt}`,
    type: "episode",
    title: pipe(
      Option.fromNullishOr(episode.title),
      Option.map((title) => `${show.title} S${episode.season}E${episode.number} ${title}`),
      Option.getOrElse(() => `${show.title} S${episode.season}E${episode.number}`),
    ),
    url: `${WEB}/shows/${slugOf(show)}/seasons/${episode.season}/episodes/${episode.number}`,
    tags: [show.title, ...yearTagsOf(show)],
  });

const watchableOf = (entry: TraktWatched | TraktRated): SubjectInput =>
  Match.value(entry).pipe(
    Match.discriminatorsExhaustive("type")({
      movie: ({ movie }) => movieOf(movie),
      show: ({ show }) => showOf(show),
      season: ({ show }) => showOf(show),
      episode: ({ show, episode }) => episodeOf(show, episode),
    }),
  );

export const historyObservationsOf = datedObservationsOf({
  kind: "consumed",
  subjectOf: Fn.flow(watchableOf, Option.some),
  occurredAtOf: ({ watched_at: watchedAt }: TraktWatched) => watchedAt,
});

export const ratingObservationsOf = datedObservationsOf({
  kind: "endorsed",
  subjectOf: (rated: TraktRated) =>
    pipe(
      Option.liftPredicate(rated, ({ rating }) => rating >= LIKED_RATING),
      Option.map(watchableOf),
    ),
  occurredAtOf: ({ rated_at: ratedAt }: TraktRated) => ratedAt,
});
