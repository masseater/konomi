import { Effect } from "effect";

import { fileFormat } from "#/features/ingest/api/providers/file-import.server";
import type { ImportFormat } from "#/features/ingest/model/provider";

import { Viewing } from "./schemas";
import { viewingObservationsOf } from "./subjects";

const PRIME_VIDEO_IMPORTS: readonly ImportFormat[] = [
  fileFormat({
    id: "viewing-history",
    file: "PrimeVideo.ViewingHistory.csv",
    label: "視聴履歴",
    howTo:
      "Amazon の「データのリクエスト」で Prime Video を頼み、届いた zip の PrimeVideo.ViewingHistory フォルダにある CSV を選ぶ。予告編と宣伝、1 分未満の再生は数えない",
    fields: [],
    row: Viewing,
    observe: ({ rows }) => Effect.succeed(viewingObservationsOf(rows)),
  }),
];

export { PRIME_VIDEO_IMPORTS };
