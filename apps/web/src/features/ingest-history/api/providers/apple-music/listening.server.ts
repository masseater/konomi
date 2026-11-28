import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation, SubjectInput } from "#/entities/signal";
import { freshOf } from "#/features/ingest-history/api/providers/fresh";
import {
  datedObservationsOf,
  fetchedObservationsOf,
} from "#/features/ingest-history/api/providers/observe";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { collectPages, pagesFor } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { API, LIBRARY_LIMIT, RECENT_LIMIT } from "./api.ts";
import type { fetchSongs } from "./fetching.server.ts";
import { catalogIdOf, songOf } from "./subjects.ts";

const FIRST_PAGE = 1;

export type Listening = Readonly<{
  fetch: ReturnType<typeof fetchSongs>;
  storefront: string;
  fetchedAt: number;
}>;

export type Recent = Readonly<{ observations: readonly Observation[]; recent: readonly string[] }>;

export const pullRecent =
  ({ fetch, storefront, fetchedAt }: Listening) =>
  (previous: readonly string[]): Effect.Effect<Recent, ProviderError> =>
    collectPages({
      first: `${API}/me/recent/played/tracks?limit=${RECENT_LIMIT}`,
      pages: FIRST_PAGE,
      fetchPage: fetch,
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

export const pullLibrary = ({ fetch, storefront, fetchedAt }: Listening): Observing =>
  collectPages({
    first: `${API}/me/library/songs?limit=${LIBRARY_LIMIT}`,
    pages: pagesFor(false),
    fetchPage: fetch,
  }).pipe(
    Effect.map(
      datedObservationsOf({
        kind: "collected",
        fetchedAt,
        subjectOf: (song) => songOf({ song, storefront }),
        occurredAtOf: ({ attributes }) =>
          pipe(
            Option.fromNullishOr(attributes),
            Option.flatMap(({ dateAdded }) => Option.fromNullishOr(dateAdded)),
            Option.getOrUndefined,
          ),
      }),
    ),
  );
