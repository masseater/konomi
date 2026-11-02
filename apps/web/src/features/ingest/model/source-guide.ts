import type { SourceId } from "#/shared/config";

const SOURCE_GUIDES: Readonly<
  Record<SourceId, Readonly<{ name: string; secretLabel: string; howTo: string }>>
> = {
  niconico: {
    name: "ニコニコ動画",
    secretLabel: "user_session の値",
    howTo:
      "ブラウザで nicovideo.jp にログインし、開発者ツールの Cookie にある user_session の値を貼る。視聴履歴・いいね・マイリスト・フォローを 1 時間ごとに取り込む",
  },
};

const STATUS_LABELS = {
  unconnected: "まだつないでいない",
  waiting: "次の取り込みを待っている",
  synced: "取り込めている",
  rejected: "ログインが切れた。貼り直す",
  failed: "取り込みに失敗した",
} as const;

export { SOURCE_GUIDES, STATUS_LABELS };
