import { Effect, Option, pipe } from "effect";

import { fileFormat, rejectImport } from "#/features/ingest/api/providers/file-import.server";
import type { ImportFormat } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { datesToEpochs } from "./dates";
import { Activity, History } from "./schemas";
import { activityObservationsOf, historyDatesOf, historyObservationsOf } from "./subjects";
import { textOf } from "./titles";

const UNREADABLE_DATES =
  "日付の書き方を読み取れない。データの書き出しの ViewingActivity.csv を使う";

const NETFLIX_IMPORTS: readonly ImportFormat[] = [
  fileFormat({
    id: "viewing-activity",
    file: "ViewingActivity.csv",
    label: "データの書き出しの",
    howTo:
      "アカウントの「個人情報をダウンロード」で書き出しを頼み、届いた zip の CONTENT_INTERACTION/ViewingActivity.csv を選ぶ。予告編と自動再生、1 分未満の再生は数えない",
    fields: [
      {
        name: FIELD.profile,
        label: "プロフィール名（空なら全員分）",
        secret: false,
        optional: true,
      },
    ],
    row: Activity,
    observe: ({ rows, fields }) =>
      Effect.succeed(activityObservationsOf({ rows, profile: textOf(fields[FIELD.profile]) })),
  }),
  fileFormat({
    id: "viewing-history",
    file: "NetflixViewingHistory.csv",
    label: "視聴履歴のページの",
    howTo:
      "netflix.com/viewingactivity の一番下の「すべてダウンロード」で落としたファイルを選ぶ。日付しか無いので、ViewingActivity.csv と同時には使わない",
    fields: [],
    row: History,
    observe: ({ rows }) =>
      pipe(
        datesToEpochs(historyDatesOf(rows)),
        Option.map((epochs) => historyObservationsOf({ rows, epochs })),
        Effect.fromOption,
        Effect.mapError(() => rejectImport(UNREADABLE_DATES)),
      ),
  }),
];

export { NETFLIX_IMPORTS };
