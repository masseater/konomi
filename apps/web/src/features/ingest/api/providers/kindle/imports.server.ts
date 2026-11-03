import { Effect, Schema } from "effect";

import type { Observation } from "#/entities/signal";
import { ImportRejected } from "#/features/ingest/model/import-rejected";
import type { ImportFormat, ImportInput } from "#/features/ingest/model/provider";

import { Library, Session } from "./schemas";
import { libraryObservationsOf, sessionObservationsOf } from "./subjects";

const decodeLibrary = Schema.decodeUnknownEffect(Schema.Array(Library));
const decodeSessions = Schema.decodeUnknownEffect(Schema.Array(Session));

const rejected = (message: string) => (): ImportRejected => ImportRejected.make({ message });

const observeLibrary = ({
  rows,
}: ImportInput): Effect.Effect<readonly Observation[], ImportRejected> =>
  decodeLibrary(rows).pipe(
    Effect.mapBoth({
      onFailure: rejected("CustomerRelationshipIndex.csv の列が見つからない。ファイルを確かめる"),
      onSuccess: libraryObservationsOf,
    }),
  );

const observeSessions = ({
  rows,
}: ImportInput): Effect.Effect<readonly Observation[], ImportRejected> =>
  decodeSessions(rows).pipe(
    Effect.mapBoth({
      onFailure: rejected(
        "reading-insights-sessions_with_adjustments.csv の列が見つからない。ファイルを確かめる",
      ),
      onSuccess: sessionObservationsOf,
    }),
  );

const KINDLE_IMPORTS: readonly ImportFormat[] = [
  {
    id: "reading-sessions",
    label: "読書の記録 reading-insights-sessions_with_adjustments.csv",
    howTo:
      "Amazon の「データのリクエスト」で Kindle を頼み、届いた zip の Kindle.ReadingInsights フォルダにある CSV を選ぶ。同じ本は 1 日 1 回、1 分未満の読書は数えない",
    fields: [],
    observe: observeSessions,
  },
  {
    id: "library",
    label: "持っている本 CustomerRelationshipIndex.csv",
    howTo:
      "同じ zip の Kindle.UnifiedLibraryIndex フォルダにある CustomerRelationshipIndex の CSV を選ぶ。サンプルは数えない",
    fields: [],
    observe: observeLibrary,
  },
];

export { KINDLE_IMPORTS };
