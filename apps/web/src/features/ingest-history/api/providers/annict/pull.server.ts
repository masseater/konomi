import { Array as Arr, Effect, Option, pipe } from "effect";
import type { Schema } from "effect";

import { bearerFieldOf } from "#/features/ingest-history/api/providers/credential-field";
import { fetchJson } from "#/features/ingest-history/api/providers/http.server";
import {
  listingOf,
  pulledListings,
  sourceOf,
} from "#/features/ingest-history/api/providers/listing.server";
import type { Listing } from "#/features/ingest-history/api/providers/listing.server";
import { pageOf } from "#/features/ingest-history/api/providers/observe";
import type { Observer } from "#/features/ingest-history/api/providers/observe";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import { pullOf } from "#/features/ingest-history/api/providers/pull-of.server";

import { API, FIELD } from "./api.ts";
import { EntriesResponse, Query, RecordsResponse } from "./schemas.ts";
import { entryObservationsOf, recordObservationsOf } from "./subjects.ts";

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

const viewerListing =
  <Response, Item>({
    label,
    query,
    schema,
    connectionOf,
  }: Readonly<{
    label: string;
    query: string;
    schema: Schema.Decoder<Response>;
    connectionOf: (response: Response) => Paged<Item>;
  }>) =>
  (observe: Observer<Item>): Listing =>
    listingOf({
      label,
      source: sourceOf({
        first: START,
        schema,
        fetch: ({ url: after, headers, schema: decoder }) =>
          fetchJson({
            url: API,
            headers,
            schema: decoder,
            post: { payload: Query, value: { query, variables: { after: afterOf(after) } } },
          }),
      })((response) => graphPageOf(connectionOf(response))),
    })(observe);

const records = viewerListing({
  label: "records",
  query: RECORDS,
  schema: RecordsResponse,
  connectionOf: ({ data }) => data.viewer.records,
})((fetchedAt) => Arr.flatMap(recordObservationsOf(fetchedAt)));

const entries = viewerListing({
  label: "entries",
  query: ENTRIES,
  schema: EntriesResponse,
  connectionOf: ({ data }) => data.viewer.libraryEntries,
})((fetchedAt) => Arr.flatMap(entryObservationsOf(fetchedAt)));

export const pullAnnict = pullOf({
  provider: "annict",
  cursor: "backfilled",
  observe: ({ credential, pages, fetchedAt }) =>
    bearerFieldOf(FIELD.token)(credential).pipe(
      Effect.flatMap((headers) =>
        pulledListings([records, entries])({ headers, pages, fetchedAt }),
      ),
    ),
});
