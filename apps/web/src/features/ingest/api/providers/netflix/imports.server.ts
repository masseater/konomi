import { Effect, Option, Schema, pipe } from "effect";

import type { Observation } from "#/entities/signal";
import { ImportRejected } from "#/features/ingest/model/import-rejected";
import type { ImportFormat, ImportInput } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { datesToEpochs } from "./dates";
import { Activity, History } from "./schemas";
import { activityObservationsOf, historyDatesOf, historyObservationsOf } from "./subjects";
import { textOf } from "./titles";

const decodeActivity = Schema.decodeUnknownEffect(Schema.Array(Activity));
const decodeHistory = Schema.decodeUnknownEffect(Schema.Array(History));

const rejected = (message: string) => (): ImportRejected => ImportRejected.make({ message });

const observeActivity = ({
  rows,
  fields,
}: ImportInput): Effect.Effect<readonly Observation[], ImportRejected> =>
  decodeActivity(rows).pipe(
    Effect.mapBoth({
      onFailure: rejected("ViewingActivity.csv の列が見つからない。ファイルを確かめる"),
      onSuccess: (decoded) =>
        activityObservationsOf({ rows: decoded, profile: textOf(fields[FIELD.profile]) }),
    }),
  );

const observeHistory = ({
  rows,
}: ImportInput): Effect.Effect<readonly Observation[], ImportRejected> =>
  decodeHistory(rows).pipe(
    Effect.mapError(rejected("NetflixViewingHistory.csv の列が見つからない。ファイルを確かめる")),
    Effect.flatMap((decoded) =>
      pipe(
        datesToEpochs(historyDatesOf(decoded)),
        Option.map((epochs) => historyObservationsOf({ rows: decoded, epochs })),
        Effect.fromOption,
        Effect.mapError(
          rejected("日付の書き方を読み取れない。データの書き出しの ViewingActivity.csv を使う"),
        ),
      ),
    ),
  );

const NETFLIX_IMPORTS: readonly ImportFormat[] = [
  {
    id: "viewing-activity",
    label: "データの書き出しの ViewingActivity.csv",
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
    observe: observeActivity,
  },
  {
    id: "viewing-history",
    label: "視聴履歴のページの NetflixViewingHistory.csv",
    howTo:
      "netflix.com/viewingactivity の一番下の「すべてダウンロード」で落としたファイルを選ぶ。日付しか無いので、ViewingActivity.csv と同時には使わない",
    fields: [],
    observe: observeHistory,
  },
];

export { NETFLIX_IMPORTS };
