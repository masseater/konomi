import { env } from "cloudflare:workers";
import { eq, isNull } from "drizzle-orm";
import { Array as Arr, Effect, Option, Schedule, Schema, String as Str, pipe } from "effect";
import { Hex } from "effect/encoding";

import { subject } from "#/entities/signal/model/signal.table";
import { EMBEDDING_DIMENSIONS, EMBEDDING_MODEL } from "#/shared/config";
import { db } from "#/shared/db/index.server";

import { creditsOf, tagsOf } from "./query.server";

const EMBEDS_PER_RUN = 200;
const EMBEDS_PER_CALL = 50;
const MAX_CHARS = 2000;
const RETRY_TIMES = 3;
const RETRY_BASE = "500 millis";
const LINE = "\n";
const TEXT_START = 0;

const taggedError = Schema.TaggedError;

class EmbeddingFailed extends taggedError<EmbeddingFailed, { readonly brand: unique symbol }>()(
  "EmbeddingFailed",
  { message: Schema.String },
) {}

const textEncoder = new TextEncoder();

const clip = Str.slice(TEXT_START, MAX_CHARS);

const vectorIdOf = (key: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-256", textEncoder.encode(key))).pipe(
    Effect.map((digest) => Hex.encode(new Uint8Array(digest))),
  );

const isComplete =
  (texts: readonly string[]) =>
  (vectors: readonly (readonly number[])[]): boolean =>
    vectors.length === texts.length &&
    pipe(
      vectors,
      Arr.every((vector) => vector.length === EMBEDDING_DIMENSIONS),
    );

const noEmbeddings = (): EmbeddingFailed =>
  EmbeddingFailed.make({ message: `${EMBEDDING_MODEL} returned no embeddings` });

const embedTexts = (
  texts: readonly string[],
): Effect.Effect<readonly (readonly number[])[], EmbeddingFailed> =>
  Effect.tryPromise({
    try: () =>
      env.AI.run(EMBEDDING_MODEL, {
        text: pipe(texts, Arr.map(clip)),
        truncate_inputs: true,
      }),
    catch: (cause) => EmbeddingFailed.make({ message: String(cause) }),
  }).pipe(
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
  const keys = pipe(
    pending,
    Arr.map(({ key }) => key),
  );
  return Effect.all({ credits: creditsOf(keys), tags: tagsOf(keys) }).pipe(
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
    { discard: true },
  );

const upsertVectors = (
  ids: readonly string[],
  vectors: readonly (readonly number[])[],
): Effect.Effect<void, EmbeddingFailed> =>
  Effect.tryPromise({
    try: () =>
      env.SUBJECT_VECTORS.upsert(
        pipe(
          ids,
          Arr.zipWith(vectors, (id, values) => ({ id, values: [...values] })),
        ),
      ),
    catch: (cause) => EmbeddingFailed.make({ message: String(cause) }),
  });

const storeVectors = (
  pending: readonly Pending[],
  vectors: readonly (readonly number[])[],
): Effect.Effect<void, EmbeddingFailed> => {
  const keys = pipe(
    pending,
    Arr.map(({ key }) => key),
  );
  return pipe(
    keys,
    Effect.forEach(vectorIdOf),
    Effect.tap((ids) => upsertVectors(ids, vectors)),
    Effect.flatMap((ids) => markEmbedded(pipe(keys, Arr.zip(ids)))),
  );
};

const embedChunk = (pending: readonly Pending[]): Effect.Effect<void, EmbeddingFailed> =>
  describeAll(pending).pipe(
    Effect.flatMap(embedTexts),
    Effect.flatMap((vectors) => storeVectors(pending, vectors)),
  );

const embedPendingSubjects: Effect.Effect<void> = pendingSubjects.pipe(
  Effect.tap((pending) => Effect.annotateCurrentSpan({ pending: pending.length })),
  Effect.flatMap((pending) =>
    Effect.forEach(pipe(pending, Arr.chunksOf(EMBEDS_PER_CALL)), embedChunk, { discard: true }),
  ),
  Effect.catchTag("EmbeddingFailed", (failed) => Effect.logWarning("embedding failed", failed)),
  Effect.withSpan("signal.embed-pending"),
);

export { EmbeddingFailed, embedPendingSubjects, embedTexts, vectorIdOf };
