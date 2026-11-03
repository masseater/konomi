import { env } from "cloudflare:workers";
import { count, inArray } from "drizzle-orm";
import { Array as Arr, Effect, Option, Record as Rec, pipe } from "effect";

import { signal, subject } from "#/entities/signal/model/signal.table";
import type { SubjectType } from "#/shared/config";
import { db } from "#/shared/db/index.server";

import { EmbeddingFailed, embedTexts, vectorIdOf } from "./embedding.server";

const SELF = 1;
const NO_SIGNALS = 0;

type SimilarSubject = Readonly<{
  key: string;
  title: string;
  url: string;
  type: SubjectType;
  score: number;
  signals: number;
}>;

type SimilarQuery =
  | Readonly<{ by: "text"; text: string; limit: number }>
  | Readonly<{ by: "subject"; subjectKey: string; limit: number }>;

const keysOf = (rows: readonly Readonly<{ key: string }>[]): string[] =>
  pipe(
    rows,
    Arr.map(({ key }) => key),
  );

type Match = Readonly<{ id: string; score: number }>;

const vectorize = (
  run: () => Promise<VectorizeMatches>,
): Effect.Effect<readonly Match[], EmbeddingFailed> =>
  Effect.tryPromise({
    try: run,
    catch: (cause) => EmbeddingFailed.make({ message: String(cause) }),
  }).pipe(Effect.map(({ matches }) => matches));

const matchesOf = (query: SimilarQuery): Effect.Effect<readonly Match[], EmbeddingFailed> => {
  if (query.by === "text") {
    return embedTexts([query.text]).pipe(
      Effect.map(Arr.flatten),
      Effect.flatMap((vector) =>
        vectorize(() => env.SUBJECT_VECTORS.query([...vector], { topK: query.limit })),
      ),
    );
  }
  return vectorIdOf(query.subjectKey).pipe(
    Effect.flatMap((id) =>
      vectorize(() => env.SUBJECT_VECTORS.queryById(id, { topK: query.limit + SELF })),
    ),
  );
};

type SubjectRow = Omit<SimilarSubject, "score" | "signals"> & Readonly<{ vectorId: string | null }>;

const subjectsOf = (ids: readonly string[]): Effect.Effect<readonly SubjectRow[]> =>
  Effect.promise(() =>
    db
      .select({
        key: subject.key,
        title: subject.title,
        url: subject.url,
        type: subject.type,
        vectorId: subject.vectorId,
      })
      .from(subject)
      .where(inArray(subject.vectorId, [...ids])),
  );

const signalCountsOf = (
  rows: readonly SubjectRow[],
): Effect.Effect<Readonly<Record<string, number>>> =>
  Effect.promise(() =>
    db
      .select({ subjectKey: signal.subjectKey, signals: count(signal.id) })
      .from(signal)
      .where(inArray(signal.subjectKey, keysOf(rows)))
      .groupBy(signal.subjectKey),
  ).pipe(
    Effect.map(
      Arr.map(({ subjectKey, signals }): readonly [string, number] => [subjectKey, signals]),
    ),
    Effect.map(Rec.fromEntries),
  );

const byVectorId = (rows: readonly SubjectRow[]): Readonly<Record<string, SubjectRow>> =>
  pipe(
    rows,
    Arr.map((row): readonly [string, SubjectRow] => [row.vectorId ?? row.key, row]),
    Rec.fromEntries,
  );

const similarOf =
  (counts: Readonly<Record<string, number>>) =>
  ({ vectorId: _vectorId, ...row }: SubjectRow, score: number): SimilarSubject => ({
    ...row,
    score,
    signals: pipe(
      Rec.get(counts, row.key),
      Option.getOrElse(() => NO_SIGNALS),
    ),
  });

const joinMatches = (matches: readonly Match[]): Effect.Effect<readonly SimilarSubject[]> =>
  subjectsOf(
    pipe(
      matches,
      Arr.map(({ id }) => id),
    ),
  ).pipe(
    Effect.flatMap((rows) =>
      signalCountsOf(rows).pipe(
        Effect.map((counts) => {
          const rowFor = byVectorId(rows);
          const describe = similarOf(counts);
          return pipe(
            matches,
            Arr.map(({ id, score }) =>
              Option.map(Rec.get(rowFor, id), (row) => describe(row, score)),
            ),
            Arr.getSomes,
          );
        }),
      ),
    ),
  );

const findSimilar = (
  query: SimilarQuery,
): Effect.Effect<readonly SimilarSubject[], EmbeddingFailed> =>
  matchesOf(query).pipe(
    Effect.flatMap(joinMatches),
    Effect.map((found) =>
      pipe(
        found,
        Arr.filter(({ key }) => query.by === "text" || key !== query.subjectKey),
        Arr.take(query.limit),
      ),
    ),
    Effect.withSpan("signal.find-similar", { attributes: { by: query.by } }),
  );

export type { SimilarQuery, SimilarSubject };
export { findSimilar };
