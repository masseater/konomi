import { Schema } from "effect";
import type { Effect } from "effect";

import { cursorStateOf } from "#/features/ingest-history/api/providers/cursor-state";
import { pagesFor, pagesUpTo } from "#/features/ingest-history/api/providers/paging.server";

const cursorState = cursorStateOf(Schema.Struct({ backfilled: Schema.Boolean }))({
  backfilled: false,
});

const backfilledOf = (cursor: string): boolean => cursorState.read(cursor).backfilled;

export const BACKFILLED: Effect.Effect<string> = cursorState.write({ backfilled: true });

export const pagesWithin =
  (backfill: number) =>
  (cursor: string): number =>
    pagesUpTo(backfill)(backfilledOf(cursor));

export const pagesOf = (cursor: string): number => pagesFor(backfilledOf(cursor));
