import { Array as Arr, Match, Option, pipe } from "effect";

import type { CreatorInput, SubjectInput } from "#/entities/signal";
import { personIn } from "#/features/ingest-history/api/providers/creator-input";
import {
  durationFromMs,
  publishedOf,
} from "#/features/ingest-history/api/providers/subject-fields";
import { orEmpty, subjectIn } from "#/features/ingest-history/api/providers/subject-in";
import type { SubjectType } from "#/shared/config";

import { WEB_ORIGIN } from "./api";
import type { AppleSong } from "./schemas";

const FULL_DATE_LENGTH = 10;
const GENERIC_GENRES: ReadonlySet<string> = new Set(["Music", "ミュージック"]);

export type Song = Readonly<{ song: AppleSong; storefront: string }>;

const artistOf = ({
  name,
  storefront,
}: Readonly<{ name: string; storefront: string }>): CreatorInput =>
  personIn("apple-music")({
    externalId: `artist:${name}`,
    title: name,
    url: `${WEB_ORIGIN}/${storefront}/search?term=${encodeURIComponent(name)}`,
  });

const typeOf = (type: string): SubjectType =>
  Match.value(type).pipe(
    Match.when("music-videos", (): SubjectType => "video"),
    Match.when("library-music-videos", (): SubjectType => "video"),
    Match.orElse((): SubjectType => "track"),
  );

export const catalogIdOf = (song: AppleSong): string =>
  pipe(
    Option.fromNullishOr(song.attributes),
    Option.flatMap(({ playParams }) => Option.fromNullishOr(playParams)),
    Option.flatMap(({ catalogId }) => Option.fromNullishOr(catalogId)),
    Option.getOrElse(() => song.id),
  );

type Attributes = NonNullable<AppleSong["attributes"]>;

const subjectOf = ({
  song,
  storefront,
  attributes,
}: Song & Readonly<{ attributes: Attributes }>): SubjectInput => {
  const externalId = catalogIdOf(song);
  const published = publishedOf(
    pipe(
      Option.fromNullishOr(attributes.releaseDate),
      Option.filter((text) => text.length === FULL_DATE_LENGTH),
    ),
  );
  const credits = pipe(
    Option.fromNullishOr(attributes.artistName),
    Option.map((name) => artistOf({ name, storefront })),
    Option.toArray,
  );
  return subjectIn("apple-music")({
    externalId,
    type: typeOf(song.type),
    title: attributes.name,
    url: pipe(
      Option.fromNullishOr(attributes.url),
      Option.getOrElse(() => `${WEB_ORIGIN}/${storefront}/song/${externalId}`),
    ),
    ...durationFromMs(Option.fromNullishOr(attributes.durationInMillis)),
    ...published,
    credits,
    tags: pipe(
      orEmpty(attributes.genreNames),
      Arr.filter((genre) => !GENERIC_GENRES.has(genre)),
    ),
  });
};

export const songOf = ({ song, storefront }: Song): Option.Option<SubjectInput> =>
  pipe(
    Option.fromNullishOr(song.attributes),
    Option.map((attributes) => subjectOf({ song, storefront, attributes })),
  );
