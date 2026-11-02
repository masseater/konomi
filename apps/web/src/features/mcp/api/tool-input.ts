import { Schema } from "effect";

import { ACTIVITY_KINDS, SOURCE_IDS } from "#/shared/config";

const MAX_LIMIT = 200;

const Limit = Schema.optionalKey(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_LIMIT })).annotate({
    description: `返す件数。既定は 50、最大 ${MAX_LIMIT}`,
  }),
);

const Instant = Schema.optionalKey(
  Schema.String.annotate({ description: "ISO 8601 の日時か日付（例: 2026-10-01）" }),
);

const Sources = Schema.optionalKey(
  Schema.Array(Schema.Literals(SOURCE_IDS)).annotate({ description: "絞り込むサービス" }),
);

const Kinds = Schema.optionalKey(
  Schema.Array(Schema.Literals(ACTIVITY_KINDS)).annotate({
    description: "watched=視聴、liked=高評価・いいね、saved=マイリストや保存、followed=フォロー",
  }),
);

const SearchInput = Schema.Struct({
  keyword: Schema.optionalKey(
    Schema.String.annotate({ description: "タイトルと投稿者の部分一致。省略すると新しい順" }),
  ),
  sources: Sources,
  kinds: Kinds,
  since: Instant,
  until: Instant,
  limit: Limit,
});

const SummaryInput = Schema.Struct({
  sources: Sources,
  kinds: Kinds,
  since: Instant,
  limit: Limit,
});

export { SearchInput, SummaryInput };
