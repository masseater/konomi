import { desc } from "drizzle-orm";
import { Array as Arr, Clock, Effect, Option, pipe } from "effect";

import { countByKind, existingSubjectKeys } from "#/entities/signal/index.server";
import type { KindCount } from "#/entities/signal/index.server";
import type { Statement } from "#/features/serve-mcp/model/statement";
import { tasteNote } from "#/features/serve-mcp/model/taste-note.table";
import { db } from "#/shared/db/index.server";

import { optionalMillis } from "./instant.ts";
import { ToolError } from "./tool-error.ts";
import type { NoteInput } from "./tool-input.ts";

const LATEST = 1;
const NEVER = 0;
const SINCE_LIMIT = 20;

export type TasteNote = Readonly<{
  statements: readonly Statement[];
  coversUntilMs: number;
  createdAtMs: number;
}>;

const latestTasteNote: Effect.Effect<Option.Option<TasteNote>> = Effect.promise(() =>
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

const requireKnownKeys = (input: typeof NoteInput.Type): Effect.Effect<void, ToolError> => {
  const keys = pipe(
    input.statements,
    Arr.flatMap(({ subjectKeys }) => subjectKeys),
    Arr.dedupe,
  );
  return existingSubjectKeys(keys).pipe(
    Effect.flatMap((known) =>
      Arr.match(Arr.difference(keys, known), {
        onEmpty: () => Effect.void,
        onNonEmpty: (unknown) =>
          Effect.fail(
            ToolError.make({ message: `unknown subject keys: ${Arr.join(unknown, ", ")}` }),
          ),
      }),
    ),
  );
};

export const writeTasteNote = (input: typeof NoteInput.Type): Effect.Effect<TasteNote, ToolError> =>
  Effect.all(
    {
      known: requireKnownKeys(input),
      coversUntilMs: optionalMillis(input.coversUntil),
      createdAtMs: Clock.currentTimeMillis,
    },
    { concurrency: 1 },
  ).pipe(
    Effect.map(({ coversUntilMs, createdAtMs }): TasteNote => ({
      statements: input.statements,
      coversUntilMs: Option.getOrElse(coversUntilMs, () => createdAtMs),
      createdAtMs,
    })),
    Effect.tap((saved) => Effect.promise(() => db.insert(tasteNote).values(saved))),
    Effect.withSpan("taste-note.save"),
  );

export const readTasteNote: Effect.Effect<
  Readonly<{ note: TasteNote | null; signalsSinceNote: readonly KindCount[] }>
> = latestTasteNote.pipe(
  Effect.flatMap((note) =>
    countByKind({
      keyword: Option.none(),
      kinds: Option.none(),
      types: Option.none(),
      providers: Option.none(),
      sinceMs: Option.some(
        Option.match(note, { onNone: () => NEVER, onSome: ({ coversUntilMs }) => coversUntilMs }),
      ),
      untilMs: Option.none(),
      limit: SINCE_LIMIT,
    }).pipe(Effect.map((signalsSinceNote) => ({ note: Option.getOrNull(note), signalsSinceNote }))),
  ),
);
