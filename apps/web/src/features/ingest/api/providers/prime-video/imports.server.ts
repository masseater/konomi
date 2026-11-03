import { Effect, Schema } from "effect";

import type { Observation } from "#/entities/signal";
import { ImportRejected } from "#/features/ingest/model/import-rejected";
import type { ImportFormat, ImportInput } from "#/features/ingest/model/provider";

import { Viewing } from "./schemas";
import { viewingObservationsOf } from "./subjects";

const decodeViewings = Schema.decodeUnknownEffect(Schema.Array(Viewing));

const observeViewings = ({
  rows,
}: ImportInput): Effect.Effect<readonly Observation[], ImportRejected> =>
  decodeViewings(rows).pipe(
    Effect.mapBoth({
      onFailure: () =>
        ImportRejected.make({
          message: "PrimeVideo.ViewingHistory.csv の列が見つからない。ファイルを確かめる",
        }),
      onSuccess: viewingObservationsOf,
    }),
  );

const PRIME_VIDEO_IMPORTS: readonly ImportFormat[] = [
  {
    id: "viewing-history",
    label: "視聴履歴 PrimeVideo.ViewingHistory.csv",
    howTo:
      "Amazon の「データのリクエスト」で Prime Video を頼み、届いた zip の PrimeVideo.ViewingHistory フォルダにある CSV を選ぶ。予告編と宣伝、1 分未満の再生は数えない",
    fields: [],
    observe: observeViewings,
  },
];

export { PRIME_VIDEO_IMPORTS };
