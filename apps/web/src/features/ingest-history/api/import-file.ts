import { run } from "@r_masseater/workers-tracing/effect";
import {
  Array as Arr,
  Effect,
  Number as Num,
  Option,
  Predicate,
  Schema,
  Stream,
  String as Str,
  pipe,
} from "effect";
import { Csv } from "effect/encoding";

import { IMPORT_ROWS_PER_REQUEST } from "#/features/ingest-history/model/import-limits";
import type { ImportRow } from "#/features/ingest-history/model/provider";
import type { ProviderId } from "#/shared/config";

import { connectionClient } from "./queries.ts";

export type ImportOutcome =
  | Readonly<{ status: "imported"; recorded: number }>
  | Readonly<{ status: "rejected"; message: string }>;

export type ImportTarget = Readonly<{
  provider: ProviderId;
  format: string;
  fields: Readonly<Record<string, string>>;
}>;

const taggedError = Schema.TaggedError;

class ImportFailed extends taggedError<ImportFailed, { readonly brand: unique symbol }>()(
  "ImportFailed",
  { message: Schema.String },
) {}

const UNKNOWN_FAILURE = "取り込めなかった";

const failureOf = (error: Readonly<{ value: unknown }> | null): ImportFailed =>
  ImportFailed.make({
    message: pipe(
      Option.fromNullishOr(error),
      Option.map(({ value }) => value),
      Option.filter(Predicate.isString),
      Option.getOrElse(() => UNKNOWN_FAILURE),
    ),
  });

const Recorded = Schema.Struct({ recorded: Schema.Finite });

const BYTE_ORDER_MARK = /^\uFEFF/u;

const rowsOf = (text: string): Effect.Effect<readonly ImportRow[], ImportFailed> =>
  Stream.make(pipe(text, Str.replace(BYTE_ORDER_MARK, ""))).pipe(
    Stream.pipeThroughChannel(Csv.decodeString({ headers: true, ignoreEmptyLines: true })),
    Stream.runCollect,
    Effect.mapError(({ line, message }) =>
      ImportFailed.make({ message: `${line} 行目を読めない: ${message}` }),
    ),
  );

const sendRows =
  (target: ImportTarget) =>
  (rows: readonly ImportRow[]): Effect.Effect<number, ImportFailed> =>
    Effect.promise(() =>
      connectionClient.api
        .connections({ provider: target.provider })
        .imports.post({ format: target.format, rows, fields: target.fields }),
    ).pipe(
      Effect.flatMap(({ data, error }) =>
        Schema.decodeUnknownEffect(Recorded)(data).pipe(Effect.mapError(() => failureOf(error))),
      ),
      Effect.map(({ recorded }) => recorded),
    );

export const importFile = ({
  file,
  ...target
}: ImportTarget & Readonly<{ file: Readonly<Pick<File, "text">> }>): Promise<ImportOutcome> =>
  run(
    Effect.promise(() => file.text()).pipe(
      Effect.flatMap(rowsOf),
      Effect.filterOrFail(Arr.isReadonlyArrayNonEmpty, () =>
        ImportFailed.make({ message: "ファイルに行が無い" }),
      ),
      Effect.flatMap((rows) =>
        Effect.forEach(Arr.chunksOf(rows, IMPORT_ROWS_PER_REQUEST), sendRows(target), {
          concurrency: 1,
        }),
      ),
      Effect.map((counts) => ({ status: "imported" as const, recorded: Num.sumAll(counts) })),
      Effect.catchTag("ImportFailed", ({ message }) =>
        Effect.succeed({ status: "rejected" as const, message }),
      ),
    ),
  );
