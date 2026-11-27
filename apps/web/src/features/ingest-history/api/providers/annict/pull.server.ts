import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import type { Observation } from "#/entities/signal";
import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import { postJson } from "#/features/ingest-history/api/providers/http.server";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { pageOf } from "#/features/ingest-history/api/providers/observe";
import type { Fetched, Observing } from "#/features/ingest-history/api/providers/observe";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD } from "./api";
import { EntriesResponse, Query, RecordsResponse } from "./schemas";
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

const graphPageOf = <Item>({ nodes, pageInfo }: Paged<Item>): Page<Item> =>
  pageOf({
    items: nodes,
    next: pipe(
      Option.liftPredicate(pageInfo, ({ hasNextPage }) => hasNextPage),
      Option.flatMap(({ endCursor }) => Option.fromNullishOr(endCursor)),
      Option.getOrUndefined,
    ),
  });

const afterOf = (cursor: string): string | null =>
  Option.getOrNull(Option.liftPredicate(cursor, (value: string) => value !== START));

type Querying = Readonly<{ headers: Headers; pages: number; fetchedAt: number }>;

const pullGraph = <Response, Item>({
  querying,
  query,
  schema,
  pageFrom,
}: Readonly<{
  querying: Querying;
  query: string;
  schema: Schema.Decoder<Response>;
  pageFrom: (response: Response) => Paged<Item>;
}>): Fetched<readonly Item[]> =>
  collectPages({
    first: START,
    pages: querying.pages,
    fetchPage: (after) =>
      postJson({
        url: API,
        headers: querying.headers,
        payload: Query,
        body: { query, variables: { after: afterOf(after) } },
        schema,
      }).pipe(Effect.map((response) => graphPageOf(pageFrom(response)))),
  });

const pullRecords = (querying: Querying): Observing => {
  const observe = recordObservationsOf(querying.fetchedAt);
  return pullGraph({
    querying,
    query: RECORDS,
    schema: RecordsResponse,
    pageFrom: ({ data }) => data.viewer.records,
  }).pipe(Effect.map(Arr.flatMap(observe)));
};

const pullEntries = (querying: Querying): Observing =>
  pullGraph({
    querying,
    query: ENTRIES,
    schema: EntriesResponse,
    pageFrom: ({ data }) => data.viewer.libraryEntries,
  }).pipe(
    Effect.map((entries): readonly Observation[] =>
      pipe(entries, Arr.map(entryObservationOf(querying.fetchedAt)), Arr.getSomes),
    ),
  );

export const pullAnnict = pullOf({
  provider: "annict",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    Effect.gen(function* annict() {
      const querying: Querying = {
        headers: yield* requireField(credential, FIELD.token).pipe(
          Effect.map((token) => ({ Authorization: `Bearer ${token}` })),
        ),
        pages,
        fetchedAt,
      };
      return [...(yield* pullRecords(querying)), ...(yield* pullEntries(querying))];
    }),
});
