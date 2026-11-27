import { Effect } from "effect";

import type { SubjectInput } from "#/entities/signal";
import { observationsOf } from "#/features/ingest-history/api/providers/observe";
import type { Observing } from "#/features/ingest-history/api/providers/observe";
import { collectPages } from "#/features/ingest-history/api/providers/paging.server";
import type { Page } from "#/features/ingest-history/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest-history/model/provider";
import type { SignalKind } from "#/shared/config";

export const collectObserved = <Item>({
  kind,
  first,
  pages,
  fetchPage,
  subjectOf,
  fetchedAt,
}: Readonly<{
  kind: SignalKind;
  first: string;
  pages: number;
  fetchPage: (url: string) => Effect.Effect<Page<Item>, ProviderError>;
  subjectOf: (item: Item) => SubjectInput;
  fetchedAt: number;
}>): Observing =>
  collectPages({ first, pages, fetchPage }).pipe(
    Effect.map(observationsOf(kind)({ subjectOf, occurredAtOf: () => fetchedAt })),
  );
