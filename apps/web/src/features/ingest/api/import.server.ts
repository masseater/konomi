import { Array as Arr, Effect, Option, pipe } from "effect";

import { recordObservations } from "#/entities/signal/index.server";
import { ImportRejected } from "#/features/ingest/model/import-rejected";
import type { ImportFormat, ImportRow } from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";

import { PROVIDERS } from "./providers/index.server";

type ImportRequest = Readonly<{
  provider: ProviderId;
  format: string;
  rows: readonly ImportRow[];
  fields: Readonly<Record<string, string>>;
}>;

const importRows = ({
  provider,
  format,
  rows,
  fields,
}: ImportRequest): Effect.Effect<number, ImportRejected> =>
  pipe(
    Option.fromUndefinedOr(PROVIDERS[provider].imports),
    Option.getOrElse((): readonly ImportFormat[] => []),
    Arr.findFirst(({ id }) => id === format),
    Effect.fromOption,
    Effect.mapError(() => ImportRejected.make({ message: "この取り込み方は無い" })),
    Effect.flatMap(({ observe }) => observe({ rows, fields })),
    Effect.flatMap(recordObservations),
    Effect.tap((recorded) =>
      Effect.logInfo("rows imported").pipe(Effect.annotateLogs({ rows: rows.length, recorded })),
    ),
    Effect.annotateLogs({ provider, format }),
    Effect.withSpan("ingest.import", { attributes: { provider, format, rows: rows.length } }),
  );

export type { ImportRequest };
export { importRows };
