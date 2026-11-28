import { runWorkersAi } from "@r_masseater/workers-tracing/workers-ai";
import { env } from "cloudflare:workers";
import { eq, isNull } from "drizzle-orm";
import { Array as Arr, Effect, Option, Schedule, Schema, String as Str, pipe } from "effect";

import { subject } from "#/entities/signal/model/signal.table";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "#/shared/config";
import { digestHex } from "#/shared/crypto/index.server";
import { db } from "#/shared/db/index.server";

import { among, creditsOf, tagsOf } from "./query.server.ts";

const EMBEDS_PER_RUN = 200;
const EMBEDS_PER_CALL = 50;
const MAX_CHARS = 2000;
const RETRY_TIMES = 3;
const RETRY_BASE = "500 millis";
const LINE = "\n";
const TEXT_START = 0;

const taggedError = Schema.TaggedError;

export class EmbeddingFailed extends taggedError<
  EmbeddingFailed,
  { readonly brand: unique symbol }
>()("EmbeddingFailed", { message: Schema.String }) {}

const clip = Str.slice(TEXT_START, MAX_CHARS);

export const vectorIdOf = (key: string): Effect.Effect<string> =>
  digestHex({ algorithm: "SHA-256", text: key });

const isComplete =
  (texts: readonly string[]) =>
  (vectors: readonly (readonly number[])[]): boolean =>
    vectors.length === texts.length &&
    pipe(
      vectors,
      Arr.every((vector) => vector.length === EMBEDDING_DIMENSIONS),
    );

const failedBy = (cause: unknown): EmbeddingFailed =>
  EmbeddingFailed.make({ message: String(cause) });

const noEmbeddings = (): EmbeddingFailed =>
  EmbeddingFailed.make({ message: `${EMBEDDING_MODEL} returned no embeddings` });

export const embedTexts = (
  texts: readonly string[],
): Effect.Effect<readonly (readonly number[])[], EmbeddingFailed> =>
  runWorkersAi({
    operation: "embeddings",
    model: EMBEDDING_MODEL,
    caller: "konomi.signal-embed",
    call: (options) =>
      env.AI.run(
        EMBEDDING_MODEL,
        { text: pipe(texts, Arr.map(clip)), truncate_inputs: true },
        options,
      ),
  }).pipe(
    Effect.mapError(failedBy),
    Effect.flatMap((output) => {
      if ("data" in output) {
        return Effect.fromOption(Option.fromUndefinedOr(output.data)).pipe(
          Effect.mapError(noEmbeddings),
        );
      }
      return Effect.fail(noEmbeddings());
    }),
    Effect.filterOrFail(isComplete(texts), noEmbeddings),
    Effect.retry({ schedule: Schedule.exponential(RETRY_BASE), times: RETRY_TIMES }),
    Effect.withSpan("signal.embed-texts", { attributes: { texts: texts.length } }),
  );

type Pending = Readonly<{ key: string; title: string }>;

const keysOf = (pending: readonly Pending[]): readonly string[] =>
  pipe(
    pending,
    Arr.map(({ key }) => key),
  );

const pendingSubjects: Effect.Effect<readonly Pending[]> = Effect.promise(() =>
  db
    .select({ key: subject.key, title: subject.title })
    .from(subject)
    .where(isNull(subject.vectorId))
    .limit(EMBEDS_PER_RUN),
);

const valuesFor = <Row extends Readonly<{ subjectKey: string }>>(
  rows: readonly Row[],
  key: string,
  pick: (row: Row) => string,
): readonly string[] =>
  pipe(
    rows,
    Arr.filter(({ subjectKey }) => subjectKey === key),
    Arr.map(pick),
  );

const describeAll = (pending: readonly Pending[]): Effect.Effect<readonly string[]> => {
  const keys = keysOf(pending);
  return Effect.all(
    { credits: creditsOf(among(keys)), tags: tagsOf(among(keys)) },
    { concurrency: 1 },
  ).pipe(
    Effect.map(({ credits, tags }) =>
      pipe(
        pending,
        Arr.map(({ key, title }) =>
          pipe(
            [
              title,
              ...valuesFor(credits, key, (found) => found.title),
              ...valuesFor(tags, key, ({ tag }) => tag),
            ],
            Arr.join(LINE),
          ),
        ),
      ),
    ),
  );
};

const markEmbedded = (keyed: readonly (readonly [string, string])[]): Effect.Effect<void> =>
  Effect.forEach(
    keyed,
    ([key, vectorId]) =>
      Effect.promise(() => db.update(subject).set({ vectorId }).where(eq(subject.key, key))),
    { concurrency: 1, discard: true },
  );

const storeVectors = (
  pending: readonly Pending[],
  vectors: readonly (readonly number[])[],
): Effect.Effect<void, EmbeddingFailed> => {
  const keys = keysOf(pending);
  return Effect.forEach(keys, vectorIdOf, { concurrency: 1 }).pipe(
    Effect.tap((ids) =>
      Effect.tryPromise({
        try: () =>
          env.SUBJECT_VECTORS.upsert(
            pipe(
              ids,
              Arr.zipWith(vectors, (id, values) => ({ id, values: [...values] })),
            ),
          ),
        catch: failedBy,
      }),
    ),
    Effect.flatMap((ids) => markEmbedded(pipe(keys, Arr.zip(ids)))),
  );
};

const embedChunk = (pending: readonly Pending[]): Effect.Effect<void, EmbeddingFailed> =>
  describeAll(pending).pipe(
    Effect.flatMap(embedTexts),
    Effect.flatMap((vectors) => storeVectors(pending, vectors)),
  );

export const embedPendingSubjects: Effect.Effect<void> = pendingSubjects.pipe(
  Effect.tap((pending) => Effect.annotateCurrentSpan({ pending: pending.length })),
  Effect.flatMap((pending) =>
    Effect.forEach(pipe(pending, Arr.chunksOf(EMBEDS_PER_CALL)), embedChunk, {
      concurrency: 1,
      discard: true,
    }),
  ),
  Effect.catchTag("EmbeddingFailed", (failed) => Effect.logWarning("embedding failed", failed)),
  Effect.withSpan("signal.embed-pending"),
);
