import { Effect } from "effect";
import type { Schema } from "effect";

import type { SubjectInput } from "#/entities/signal";
import type { Headers } from "#/features/ingest-history/api/providers/http.server";
import { observationsOf } from "#/features/ingest-history/api/providers/observe";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { collectJsonPages } from "#/features/ingest-history/api/providers/paging.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import type { SignalKind } from "#/shared/config";

export const collectObserved = <
  Item,
  Body extends Schema.Top & Readonly<{ DecodingServices: never }>,
>({
  kind,
  first,
  headers,
  pages,
  schema,
  pageOf,
  subjectOf,
  fetchedAt,
}: Readonly<{
  kind: SignalKind;
  first: string;
  headers: Headers;
  pages: number;
  schema: Body;
  pageOf: (body: Body["Type"], url: string) => Page<Item>;
  subjectOf: (item: Item) => SubjectInput;
  fetchedAt: number;
}>): Observing =>
  collectJsonPages({ first, headers, pages, schema, pageOf }).pipe(
    Effect.map(observationsOf(kind)({ subjectOf, occurredAtOf: () => fetchedAt })),
  );
