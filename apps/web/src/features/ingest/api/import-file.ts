import { Array as Arr, Effect, Number as Num, Option, Schema, String as Str, pipe } from "effect";
import Papa from "papaparse";

import { IMPORT_ROWS_PER_REQUEST } from "#/features/ingest/model/import-limits";
import type { ImportRow } from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";

import { connectionClient } from "./queries";

type ImportOutcome =
  | Readonly<{ status: "imported"; recorded: number }>
  | Readonly<{ status: "rejected"; message: string }>;

type ImportTarget = Readonly<{
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
      Option.map(({ value }) => String(value)),
      Option.getOrElse(() => UNKNOWN_FAILURE),
    ),
  });

const Recorded = Schema.Struct({ recorded: Schema.Finite });

const BYTE_ORDER_MARK = /^﻿/u;

const rowsOf = (text: string): readonly ImportRow[] =>
  Papa.parse<ImportRow>(pipe(text, Str.replace(BYTE_ORDER_MARK, "")), {
    header: true,
    skipEmptyLines: true,
  }).data;

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

const importFile = ({
  file,
  ...target
}: ImportTarget & Readonly<{ file: Readonly<Pick<File, "text">> }>): Promise<ImportOutcome> =>
  Effect.runPromise(
    Effect.promise(() => file.text()).pipe(
      Effect.map(rowsOf),
      Effect.filterOrFail(Arr.isReadonlyArrayNonEmpty, () =>
        ImportFailed.make({ message: "ファイルに行が無い" }),
      ),
      Effect.flatMap((rows) =>
        Effect.forEach(Arr.chunksOf(rows, IMPORT_ROWS_PER_REQUEST), sendRows(target)),
      ),
      Effect.map((counts) => ({ status: "imported" as const, recorded: Num.sumAll(counts) })),
      Effect.catchTag("ImportFailed", ({ message }) =>
        Effect.succeed({ status: "rejected" as const, message }),
      ),
    ),
  );

export type { ImportOutcome, ImportTarget };
export { importFile };
