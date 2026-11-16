import type { McpServer } from "@modelcontextprotocol/server";
import { Array as Arr, Clock, Effect, Option, Schema, pipe } from "effect";

import { countByKind, existingSubjectKeys, findSimilar } from "#/entities/signal/index.server";
import type { KindCount, SimilarQuery, SimilarSubject } from "#/entities/signal/index.server";

import { optionalMillis } from "./instant";
import { latestTasteNote, saveTasteNote } from "./taste-note.server";
import type { TasteNote } from "./taste-note.server";
import { ToolError } from "./tool-error";
import { EmptyInput, NoteInput, SimilarInput } from "./tool-input";
import { runTool } from "./tool-result.server";

const DEFAULT_LIMIT = 20;
const NEVER = 0;
const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
const WRITES = { readOnlyHint: false, destructiveHint: false, idempotentHint: false };
const SIMILAR_SCHEMA = SimilarInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const NOTE_SCHEMA = NoteInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const EMPTY_SCHEMA = EmptyInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

const similarQueryOf = (
  input: typeof SimilarInput.Type,
): Effect.Effect<SimilarQuery, ToolError> => {
  const limit = input.limit ?? DEFAULT_LIMIT;
  const text = Option.fromUndefinedOr(input.text);
  const subjectKey = Option.fromUndefinedOr(input.subjectKey);
  const byText = pipe(
    text,
    Option.filter(() => Option.isNone(subjectKey)),
    Option.map((value): SimilarQuery => ({ by: "text", text: value, limit })),
  );
  const bySubject = pipe(
    subjectKey,
    Option.filter(() => Option.isNone(text)),
    Option.map((value): SimilarQuery => ({ by: "subject", subjectKey: value, limit })),
  );
  return pipe(
    byText,
    Option.orElse(() => bySubject),
    Effect.fromOption,
    Effect.mapError(() =>
      ToolError.make({ message: "text と subjectKey のどちらか一方を指定する" }),
    ),
  );
};

const similarOf = (
  input: typeof SimilarInput.Type,
): Effect.Effect<readonly SimilarSubject[], ToolError> =>
  similarQueryOf(input).pipe(
    Effect.flatMap(findSimilar),
    Effect.catchTag("EmbeddingFailed", ({ message }) => Effect.fail(ToolError.make({ message }))),
  );

type NoteView = Readonly<{
  note: TasteNote | null;
  signalsSinceNote: readonly KindCount[];
}>;

const noteView: Effect.Effect<NoteView> = latestTasteNote.pipe(
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
      limit: DEFAULT_LIMIT,
    }).pipe(
      Effect.map((signalsSinceNote) => ({
        note: Option.getOrNull(note),
        signalsSinceNote,
      })),
    ),
  ),
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

const writeNote = (input: typeof NoteInput.Type): Effect.Effect<TasteNote, ToolError> =>
  Effect.all({
    known: requireKnownKeys(input),
    coversUntilMs: optionalMillis(input.coversUntil),
    nowMs: Clock.currentTimeMillis,
  }).pipe(
    Effect.flatMap(({ coversUntilMs, nowMs }) =>
      saveTasteNote({
        statements: input.statements,
        coversUntilMs: Option.getOrElse(coversUntilMs, () => nowMs),
      }),
    ),
  );

const registerTasteTools = (server: McpServer): McpServer => {
  server.registerTool(
    "find_similar",
    {
      description:
        "文か対象の key から、意味の近い対象を持ち主の記録の中から探す。サービスをまたいだ同じ曲や、題名の違う同じ系統のものが見つかる。signals はその対象への持ち主の反応の数",
      inputSchema: SIMILAR_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) => runTool(similarOf(input)),
  );
  server.registerTool(
    "read_taste_note",
    {
      description:
        "前に書いた好みのメモと、そのメモが読み終えた日時より後に増えた記録の数を返す。好みを語る前に読み、記録が増えていれば taste_profile と search_signals で確かめてから write_taste_note で書き直す",
      inputSchema: EMPTY_SCHEMA,
      annotations: READ_ONLY,
    },
    () => runTool(noteView),
  );
  server.registerTool(
    "write_taste_note",
    {
      description:
        "持ち主の好みを文で書き残す。1 文ごとに根拠の対象の key を付け、記録で確かめられたことだけを書く。人気や世間の評判で補わない。前のメモは履歴として残る",
      inputSchema: NOTE_SCHEMA,
      annotations: WRITES,
    },
    (input) => runTool(writeNote(input)),
  );
  return server;
};

export { registerTasteTools };
