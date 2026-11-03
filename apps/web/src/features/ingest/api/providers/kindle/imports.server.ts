import { Effect } from "effect";

import { fileFormat } from "#/features/ingest/api/providers/file-import.server";
import type { ImportFormat } from "#/features/ingest/model/provider";

import { Library, Session } from "./schemas";
import { libraryObservationsOf, sessionObservationsOf } from "./subjects";

const KINDLE_IMPORTS: readonly ImportFormat[] = [
  fileFormat({
    id: "reading-sessions",
    file: "reading-insights-sessions_with_adjustments.csv",
    label: "読書の記録",
    howTo:
      "Amazon の「データのリクエスト」で Kindle を頼み、届いた zip の Kindle.ReadingInsights フォルダにある CSV を選ぶ。同じ本は 1 日 1 回、1 分未満の読書は数えない",
    fields: [],
    row: Session,
    observe: ({ rows }) => Effect.succeed(sessionObservationsOf(rows)),
  }),
  fileFormat({
    id: "library",
    file: "CustomerRelationshipIndex.csv",
    label: "持っている本",
    howTo:
      "同じ zip の Kindle.UnifiedLibraryIndex フォルダにある CustomerRelationshipIndex の CSV を選ぶ。サンプルは数えない",
    fields: [],
    row: Library,
    observe: ({ rows }) => Effect.succeed(libraryObservationsOf(rows)),
  }),
];

export { KINDLE_IMPORTS };
