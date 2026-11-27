import { Array as Arr, Effect, Option, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { postJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";

import { API, FIELD } from "./api";
import { EntriesResponse, Query, RecordsResponse } from "./schemas";
import type { AnnictEntry } from "./schemas";
import { entryObservationOf, recordObservationsOf } from "./subjects";

const START = "";

const RECORDS = `query ($after: String) {
  viewer {
    records(first: 50, after: $after, orderBy: { field: CREATED_AT, direction: DESC }) {
      nodes { createdAt ratingState episode { annictId numberText title } work { annictId title seasonYear } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

const ENTRIES = `query ($after: String) {
  viewer {
    libraryEntries(first: 50, after: $after, states: [WATCHING, WATCHED]) {
      nodes { status { state createdAt } work { annictId title seasonYear } }
      pageInfo { hasNextPage endCursor }
    }
  }
}`;

type Paged<Item> = Readonly<{
  nodes: readonly Item[];
  pageInfo: Readonly<{ hasNextPage: boolean; endCursor?: string | null | undefined }>;
}>;

const pageOf = <Item>({
  nodes,
  pageInfo,
}: Paged<Item>): Readonly<{
  items: readonly Item[];
  next: Option.Option<string>;
}> => ({
  items: nodes,
  next: pipe(
    Option.fromNullishOr(pageInfo.endCursor),
    Option.filter(() => pageInfo.hasNextPage),
  ),
});

const afterOf = (cursor: string): string | null =>
  Option.getOrNull(Option.liftPredicate(cursor, (value: string) => value !== START));

type Querying = Readonly<{ headers: Headers; pages: number; fetchedAt: number }>;

const pullRecords = ({
  headers,
  pages,
  fetchedAt,
}: Querying): Effect.Effect<readonly Observation[], ProviderError> => {
  const observe = recordObservationsOf(fetchedAt);
  return collectPages({
    first: START,
    pages,
    fetchPage: (after) =>
      postJson({
        url: API,
        headers,
        payload: Query,
        body: { query: RECORDS, variables: { after: afterOf(after) } },
        schema: RecordsResponse,
      }).pipe(Effect.map(({ data }) => pageOf(data.viewer.records))),
  }).pipe(Effect.map(Arr.flatMap(observe)));
};

const pullEntries = ({
  headers,
  pages,
  fetchedAt,
}: Querying): Effect.Effect<readonly Observation[], ProviderError> => {
  const observe = entryObservationOf(fetchedAt);
  const observeAll = (entries: readonly AnnictEntry[]): readonly Observation[] =>
    pipe(entries, Arr.map(observe), Arr.getSomes);
  return collectPages({
    first: START,
    pages,
    fetchPage: (after) =>
      postJson({
        url: API,
        headers,
        payload: Query,
        body: { query: ENTRIES, variables: { after: afterOf(after) } },
        schema: EntriesResponse,
      }).pipe(Effect.map(({ data }) => pageOf(data.viewer.libraryEntries))),
  }).pipe(Effect.map(observeAll));
};

export const pullAnnict = pullOf({
  provider: "annict",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* annict() {
      const querying: Querying = {
        headers: yield* requireField(credential, FIELD.token).pipe(
          Effect.map((token) => ({ Authorization: `Bearer ${token}` })),
        ),
        pages: pages,
        fetchedAt,
      };
      return [...(yield* pullRecords(querying)), ...(yield* pullEntries(querying))];
    }),
});
