import { desc } from "drizzle-orm";
import type { Option } from "effect";
import { Array as Arr, Clock, Effect, pipe } from "effect";

import type { Statement } from "#/features/serve-mcp/model/statement";
import { tasteNote } from "#/features/serve-mcp/model/taste-note.table";
import { db } from "#/shared/db/index.server";

const LATEST = 1;

export type TasteNote = Readonly<{
  statements: readonly Statement[];
  coversUntilMs: number;
  createdAtMs: number;
}>;

export const latestTasteNote: Effect.Effect<Option.Option<TasteNote>> = Effect.promise(() =>
  db
    .select({
      statements: tasteNote.statements,
      coversUntilMs: tasteNote.coversUntilMs,
      createdAtMs: tasteNote.createdAtMs,
    })
    .from(tasteNote)
    .orderBy(desc(tasteNote.createdAtMs), desc(tasteNote.id))
    .limit(LATEST),
).pipe(
  Effect.map((rows) => pipe(rows, Arr.head)),
  Effect.withSpan("taste-note.latest"),
);

export const saveTasteNote = (
  note: Readonly<{ statements: readonly Statement[]; coversUntilMs: number }>,
): Effect.Effect<TasteNote> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((createdAtMs): TasteNote => ({ ...note, createdAtMs })),
    Effect.tap((saved) => Effect.promise(() => db.insert(tasteNote).values(saved))),
    Effect.withSpan("taste-note.save"),
  );
