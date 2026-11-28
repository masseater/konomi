import { Array as Arr, Option, pipe, Function as Fn } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { creatorMapper } from "#/features/ingest-history/api/providers/creator-input";
import { datedObservationsOf } from "#/features/ingest-history/api/providers/observe";
import { durationOf, publishedOf } from "#/features/ingest-history/api/providers/subject-fields";
import { orEmpty, subjectIn } from "#/features/ingest-history/api/providers/subject-in";

import { WEB } from "./api.ts";
import type { VocaDbCredit, VocaDbRated } from "./schemas.ts";

const artistOf = creatorMapper({
  provider: "vocadb",
  idPrefix: "artist:",
  urlBase: `${WEB}/Ar/`,
});

const RATING_LABEL: Readonly<Record<string, string>> = { Favorite: "お気に入り", Like: "好き" };

const creditOf = ({ artist }: VocaDbCredit): Option.Option<CreatorInput> =>
  pipe(Option.fromNullishOr(artist), Option.map(artistOf));

const songOf = ({ song }: VocaDbRated): SubjectInput =>
  subjectIn("vocadb")({
    externalId: `song:${song.id}`,
    type: "track",
    title: song.name,
    url: `${WEB}/S/${song.id}`,
    ...durationOf(Option.fromNullishOr(song.lengthSeconds), "seconds"),
    ...publishedOf(Option.fromNullishOr(song.publishDate)),
    credits: pipe(orEmpty(song.artists), Arr.map(creditOf), Arr.getSomes),
    tags: Option.toArray(Option.fromNullishOr(song.songType)),
  });

export const ratedObservationsOf = datedObservationsOf({
  kind: "endorsed",
  subjectOf: Fn.flow(songOf, Option.some),
  occurredAtOf: ({ date }: VocaDbRated) => date,
  contextOf: ({ rating }) => Option.fromUndefinedOr(RATING_LABEL[rating]),
});
