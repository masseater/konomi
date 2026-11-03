import { Array as Arr, Clock, Effect, Option, Schema, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { postJson } from "#/features/ingest/api/providers/http.server";
import type { Headers } from "#/features/ingest/api/providers/http.server";
import { collectPages, pagesFor } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { API, FIELD } from "./api";
import { EntriesResponse, Query, RecordsResponse } from "./schemas";
import type { AnnictEntry } from "./schemas";
import { entryObservationOf, recordObservationsOf } from "./subjects";

const CursorJson = Schema.fromJsonString(Schema.Struct({ backfilled: Schema.Boolean }));
const decodeCursor = Schema.decodeUnknownOption(CursorJson);
const encodeCursor = Schema.encodeEffect(CursorJson);
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

const pullAnnict = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* annict() {
    const { backfilled } = pipe(
      decodeCursor(cursor),
      Option.getOrElse(() => ({ backfilled: false })),
    );
    const querying: Querying = {
      headers: yield* requireField(credential, FIELD.token).pipe(
        Effect.map((token) => ({ Authorization: `Bearer ${token}` })),
      ),
      pages: pagesFor(backfilled),
      fetchedAt: yield* Clock.currentTimeMillis,
    };
    return {
      observations: [...(yield* pullRecords(querying)), ...(yield* pullEntries(querying))],
      cursor: yield* encodeCursor({ backfilled: true }).pipe(Effect.orDie),
    };
  }).pipe(Effect.withSpan("annict.pull"));

export { pullAnnict };
