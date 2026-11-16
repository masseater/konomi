import type { SignalKind } from "#/shared/config";

const STATUS_LABELS = {
  unconnected: "まだつないでいない",
  waiting: "次の取り込みを待っている",
  synced: "取り込めている",
  rejected: "ログインが切れた。ログイン情報を入れ直す",
  failed: "取り込みに失敗した",
} as const;

const SIGNAL_LABELS: Readonly<Record<SignalKind, string>> = {
  consumed: "見た・聴いた",
  endorsed: "高評価",
  collected: "保存",
  followed: "フォロー",
};

export { SIGNAL_LABELS, STATUS_LABELS };
