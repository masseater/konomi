import { Array as Arr, Match, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import type { SubjectType } from "#/shared/config";

import { WEB_ORIGIN } from "./api";
import type { AppleSong } from "./schemas";

const MS_PER_SECOND = 1000;
const FULL_DATE_LENGTH = 10;
const GENERIC_GENRES: ReadonlySet<string> = new Set(["Music", "ミュージック"]);

type Song = Readonly<{ song: AppleSong; storefront: string }>;

const artistOf = ({
  name,
  storefront,
}: Readonly<{ name: string; storefront: string }>): CreatorInput => ({
  provider: "apple-music",
  externalId: `artist:${name}`,
  type: "person",
  title: name,
  url: `${WEB_ORIGIN}/${storefront}/search?term=${encodeURIComponent(name)}`,
});

const typeOf = (type: string): SubjectType =>
  Match.value(type).pipe(
    Match.when("music-videos", (): SubjectType => "video"),
    Match.when("library-music-videos", (): SubjectType => "video"),
    Match.orElse((): SubjectType => "track"),
  );

const catalogIdOf = (song: AppleSong): string =>
  pipe(
    Option.fromNullishOr(song.attributes),
    Option.flatMap(({ playParams }) => Option.fromNullishOr(playParams)),
    Option.flatMap(({ catalogId }) => Option.fromNullishOr(catalogId)),
    Option.getOrElse(() => song.id),
  );

const durationOf = (millis: number | null | undefined): Readonly<{ durationSec?: number }> =>
  pipe(
    Option.fromNullishOr(millis),
    Option.map((ms) => ({ durationSec: Math.round(ms / MS_PER_SECOND) })),
    Option.getOrElse(() => ({})),
  );

const releasedOf = (date: string | null | undefined): Readonly<{ publishedAtMs?: number }> =>
  pipe(
    Option.fromNullishOr(date),
    Option.filter((text) => text.length === FULL_DATE_LENGTH),
    Option.map((text) => Date.parse(text)),
    Option.filter(Number.isFinite),
    Option.map((publishedAtMs) => ({ publishedAtMs })),
    Option.getOrElse(() => ({})),
  );

type Attributes = NonNullable<AppleSong["attributes"]>;

const subjectOf = ({
  song,
  storefront,
  attributes,
}: Song & Readonly<{ attributes: Attributes }>): SubjectInput => {
  const externalId = catalogIdOf(song);
  return {
    provider: "apple-music",
    externalId,
    type: typeOf(song.type),
    title: attributes.name,
    url: pipe(
      Option.fromNullishOr(attributes.url),
      Option.getOrElse(() => `${WEB_ORIGIN}/${storefront}/song/${externalId}`),
    ),
    ...durationOf(attributes.durationInMillis),
    ...releasedOf(attributes.releaseDate),
    credits: pipe(
      Option.fromNullishOr(attributes.artistName),
      Option.map((name) => artistOf({ name, storefront })),
      Option.toArray,
    ),
    tags: pipe(
      Option.fromNullishOr(attributes.genreNames),
      Option.map(Arr.filter((genre) => !GENERIC_GENRES.has(genre))),
      Option.getOrElse((): readonly string[] => []),
    ),
  };
};

const songOf = ({ song, storefront }: Song): Option.Option<SubjectInput> =>
  pipe(
    Option.fromNullishOr(song.attributes),
    Option.map((attributes) => subjectOf({ song, storefront, attributes })),
  );

export { catalogIdOf, songOf };
