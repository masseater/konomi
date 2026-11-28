import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { personMapper } from "#/features/ingest-history/api/providers/creator-input";
import { stampedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import { durationOf, publishedOf } from "#/features/ingest-history/api/providers/subject-fields";

import { WEB } from "./api.ts";
import type { VocaDbCredit, VocaDbRated } from "./schemas.ts";

const artistOf = personMapper({
  provider: "vocadb",
  idPrefix: "artist:",
  urlBase: `${WEB}/Ar/`,
});

const RATING_LABEL: Readonly<Record<string, string>> = { Favorite: "お気に入り", Like: "好き" };

const creditOf = ({ artist }: VocaDbCredit): Option.Option<CreatorInput> =>
  pipe(Option.fromNullishOr(artist), Option.map(artistOf));

const songOf = ({ song }: VocaDbRated): SubjectInput => ({
  provider: "vocadb",
  externalId: `song:${song.id}`,
  type: "track",
  title: song.name,
  url: `${WEB}/S/${song.id}`,
  ...durationOf(Option.fromNullishOr(song.lengthSeconds)),
  ...publishedOf(Option.fromNullishOr(song.publishDate)),
  credits: pipe(
    Option.fromNullishOr(song.artists),
    Option.getOrElse((): readonly VocaDbCredit[] => []),
    Arr.map(creditOf),
    Arr.getSomes,
  ),
  tags: Option.toArray(Option.fromNullishOr(song.songType)),
});

export const ratedObservationsOf = stampedObservationsOf("endorsed")({
  subjectOf: songOf,
  dateOf: ({ date }) => date,
  contextOf: ({ rating }) => Option.fromUndefinedOr(RATING_LABEL[rating]),
});
