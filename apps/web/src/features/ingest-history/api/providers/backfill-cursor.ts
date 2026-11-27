import { Effect, Option, Schema, pipe } from "effect";

import { pagesFor, pagesUpTo } from "#/features/ingest-history/api/providers/paging.server";

const CursorJson = Schema.fromJsonString(Schema.Struct({ backfilled: Schema.Boolean }));
const decodeCursor = Schema.decodeUnknownOption(CursorJson);
const encodeCursor = Schema.encodeEffect(CursorJson);

const backfilledOf = (cursor: string): boolean =>
  pipe(
    decodeCursor(cursor),
    Option.map(({ backfilled }) => backfilled),
    Option.getOrElse(() => false),
  );

export const BACKFILLED: Effect.Effect<string> = encodeCursor({ backfilled: true }).pipe(
  Effect.orDie,
);

export const pagesWithin =
  (backfill: number) =>
  (cursor: string): number =>
    pagesUpTo(backfill)(backfilledOf(cursor));

export const pagesOf = (cursor: string): number => pagesFor(backfilledOf(cursor));
