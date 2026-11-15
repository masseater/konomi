import { Array as Arr, Match, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest/api/providers/observe";

import { WEB } from "./api";
import type { TraktEpisode, TraktRated, TraktWatchable, TraktWatched, TraktWork } from "./schemas";

const LIKED_RATING = 8;

const slugOf = (work: TraktWork): string =>
  pipe(
    Option.fromNullishOr(work.ids.slug),
    Option.getOrElse(() => String(work.ids.trakt)),
  );

const yearTagsOf = (work: TraktWork): readonly string[] =>
  pipe(Option.fromNullishOr(work.year), Option.map(String), Option.toArray);

const movieOf = (movie: TraktWork): SubjectInput => ({
  provider: "trakt",
  externalId: `movie:${movie.ids.trakt}`,
  type: "movie",
  title: movie.title,
  url: `${WEB}/movies/${slugOf(movie)}`,
  credits: [],
  tags: yearTagsOf(movie),
});

const showOf = (show: TraktWork): SubjectInput => ({
  provider: "trakt",
  externalId: `show:${show.ids.trakt}`,
  type: "series",
  title: show.title,
  url: `${WEB}/shows/${slugOf(show)}`,
  credits: [],
  tags: yearTagsOf(show),
});

const episodeOf = (show: TraktWork, episode: TraktEpisode): SubjectInput => ({
  provider: "trakt",
  externalId: `episode:${episode.ids.trakt}`,
  type: "episode",
  title: pipe(
    Option.fromNullishOr(episode.title),
    Option.map((title) => `${show.title} S${episode.season}E${episode.number} ${title}`),
    Option.getOrElse(() => `${show.title} S${episode.season}E${episode.number}`),
  ),
  url: `${WEB}/shows/${slugOf(show)}/seasons/${episode.season}/episodes/${episode.number}`,
  credits: [],
  tags: [show.title, ...yearTagsOf(show)],
});

const watchableOf = (watchable: TraktWatchable): SubjectInput =>
  Match.value(watchable).pipe(
    Match.discriminatorsExhaustive("type")({
      movie: ({ movie }) => movieOf(movie),
      show: ({ show }) => showOf(show),
      season: ({ show }) => showOf(show),
      episode: ({ show, episode }) => episodeOf(show, episode),
    }),
  );

const historyObservationsOf =
  (fetchedAt: number) =>
  (history: readonly TraktWatched[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    const observe = (watched: TraktWatched): Observation => ({
      kind: "consumed",
      subject: watchableOf(watched),
      occurredAtMs: at(watched.watched_at),
    });
    return pipe(history, Arr.map(observe));
  };

const ratingObservationsOf =
  (fetchedAt: number) =>
  (ratings: readonly TraktRated[]): readonly Observation[] => {
    const at = epochOr(fetchedAt);
    const observe = (rated: TraktRated): Option.Option<Observation> =>
      pipe(
        Option.some(rated),
        Option.filter(({ rating }) => rating >= LIKED_RATING),
        Option.map(watchableOf),
        Option.map((subject) => ({
          kind: "endorsed" as const,
          subject,
          occurredAtMs: at(rated.rated_at),
        })),
      );
    return pipe(ratings, Arr.map(observe), Arr.getSomes);
  };

export { historyObservationsOf, ratingObservationsOf };
