import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { freshOf } from "#/features/ingest-history/api/providers/fresh";
import { listingOf } from "#/features/ingest-history/api/providers/listing.server";
import {
  datedObservationsOf,
  fetchedObservationsOf,
} from "#/features/ingest-history/api/providers/observe";
import type { Fetching, Observing } from "#/features/ingest-history/api/providers/observe";
import { collectPages, pagesFor } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { API, LIBRARY_LIMIT, RECENT_LIMIT } from "./api.ts";
import { songsFrom } from "./fetching.server.ts";
import { catalogIdOf, songOf } from "./subjects.ts";

const FIRST_PAGE = 1;

export type Listening = Fetching & Readonly<{ storefront: string }>;

export type Recent = Readonly<{ observations: readonly Observation[]; recent: readonly string[] }>;

export const pullRecent =
  ({ headers, storefront, fetchedAt }: Listening) =>
  (previous: readonly string[]): Effect.Effect<Recent, ProviderError> =>
    collectPages({
      pages: FIRST_PAGE,
      ...songsFrom(`${API}/me/recent/played/tracks?limit=${RECENT_LIMIT}`)(headers),
    }).pipe(
      Effect.map((songs) => {
        const recent = pipe(songs, Arr.map(catalogIdOf));
        const fresh = freshOf({ previous, current: recent });
        return {
          observations: pipe(
            songs,
            Arr.take(fresh.length),
            Arr.map((song) => songOf({ song, storefront })),
            Arr.getSomes,
            fetchedObservationsOf("consumed")((subject: SubjectInput) => subject)(fetchedAt),
          ),
          recent,
        };
      }),
    );

export const pullLibrary = ({ headers, storefront, fetchedAt }: Listening): Observing =>
  listingOf({
    label: "library",
    source: songsFrom(`${API}/me/library/songs?limit=${LIBRARY_LIMIT}`),
  })(
    datedObservationsOf({
      kind: "collected",
      subjectOf: (song) => songOf({ song, storefront }),
      occurredAtOf: ({ attributes }) =>
        pipe(
          Option.fromNullishOr(attributes),
          Option.flatMap(({ dateAdded }) => Option.fromNullishOr(dateAdded)),
          Option.getOrUndefined,
        ),
    }),
  )({ headers, pages: pagesFor(false), fetchedAt });
