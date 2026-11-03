import { Effect, Option, Schema, pipe } from "effect";

import { pagesFor } from "#/features/ingest/api/providers/paging.server";

const CursorJson = Schema.fromJsonString(Schema.Struct({ backfilled: Schema.Boolean }));
const decodeCursor = Schema.decodeUnknownOption(CursorJson);
const encodeCursor = Schema.encodeEffect(CursorJson);

const backfilledOf = (cursor: string): boolean =>
  pipe(
    decodeCursor(cursor),
    Option.map(({ backfilled }) => backfilled),
    Option.getOrElse(() => false),
  );

const BACKFILLED: Effect.Effect<string> = encodeCursor({ backfilled: true }).pipe(Effect.orDie);

const pagesOf = (cursor: string): number => pagesFor(backfilledOf(cursor));

export { BACKFILLED, pagesOf };
