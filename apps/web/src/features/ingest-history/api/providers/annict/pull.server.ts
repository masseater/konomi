import { Array as Arr, Effect, Option, pipe } from "effect";

import { requireField } from "#/features/ingest-history/api/providers/credential-field";
import {
  graphListing,
  pulledListings,
} from "#/features/ingest-history/api/providers/listing.server";
import { pageOf } from "#/features/ingest-history/api/providers/observe";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD } from "./api";
import { EntriesResponse, Query, RecordsResponse } from "./schemas";
import { entryObservationsOf, recordObservationsOf } from "./subjects";

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

const records = graphListing({
  url: API,
  first: START,
  payload: Query,
  bodyAt: (after) => ({ query: RECORDS, variables: { after: afterOf(after) } }),
  schema: RecordsResponse,
  pageFrom: ({ data }) => graphPageOf(data.viewer.records),
  observe: (fetchedAt) => Arr.flatMap(recordObservationsOf(fetchedAt)),
});

const entries = graphListing({
  url: API,
  first: START,
  payload: Query,
  bodyAt: (after) => ({ query: ENTRIES, variables: { after: afterOf(after) } }),
  schema: EntriesResponse,
  pageFrom: ({ data }) => graphPageOf(data.viewer.libraryEntries),
  observe: (fetchedAt) => Arr.flatMap(entryObservationsOf(fetchedAt)),
});

export const pullAnnict = pullOf({
  provider: "annict",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    requireField(credential, FIELD.token).pipe(
      Effect.flatMap((token) =>
        pulledListings([records, entries])({
          headers: { Authorization: `Bearer ${token}` },
          pages,
          fetchedAt,
        }),
      ),
    ),
});
