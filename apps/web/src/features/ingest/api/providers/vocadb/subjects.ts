import { Array as Arr, Option, pipe } from "effect";

import type { CreatorInput, Observation, SubjectInput } from "#/entities/signal";
import { epochOr } from "#/features/ingest/api/providers/observe";
import { durationOf, publishedOf } from "#/features/ingest/api/providers/subject-fields";

import { WEB } from "./api";
import type { VocaDbCredit, VocaDbRated } from "./schemas";

const RATING_LABEL: Readonly<Record<string, string>> = { Favorite: "お気に入り", Like: "好き" };

const creditOf = ({ artist }: VocaDbCredit): Option.Option<CreatorInput> =>
  pipe(
    Option.fromNullishOr(artist),
    Option.map(({ id, name }) => ({
      provider: "vocadb" as const,
      externalId: `artist:${id}`,
      type: "person" as const,
      title: name,
      url: `${WEB}/Ar/${id}`,
    })),
  );

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

const ratedObservationOf =
  (at: (text: string) => number) =>
  (entry: VocaDbRated): Observation => ({
    kind: "endorsed",
    subject: songOf(entry),
    occurredAtMs: at(entry.date),
    ...pipe(
      Option.fromUndefinedOr(RATING_LABEL[entry.rating]),
      Option.map((context) => ({ context })),
      Option.getOrElse(() => ({})),
    ),
  });

const ratedObservationsOf =
  (fetchedAt: number) =>
  (rated: readonly VocaDbRated[]): readonly Observation[] => {
    const observe = ratedObservationOf(epochOr(fetchedAt));
    return pipe(rated, Arr.map(observe));
  };

export { ratedObservationsOf, songOf };
