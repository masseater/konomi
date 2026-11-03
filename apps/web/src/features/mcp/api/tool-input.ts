import { Schema } from "effect";

import { StatementSchema } from "#/features/mcp/model/statement";
import { PROVIDER_IDS, SIGNAL_KINDS, SUBJECT_TYPES } from "#/shared/config";

const MAX_LIMIT = 80;

const Limit = Schema.optionalKey(
  Schema.Int.check(Schema.isBetween({ minimum: 1, maximum: MAX_LIMIT })).annotate({
    description: `返す件数。既定は 30、最大 ${MAX_LIMIT}`,
  }),
);

const Instant = Schema.optionalKey(
  Schema.String.annotate({ description: "ISO 8601 の日時か日付（例: 2026-10-01）" }),
);

const Providers = Schema.optionalKey(
  Schema.Array(Schema.Literals(PROVIDER_IDS)).annotate({ description: "絞り込むサービス" }),
);

const Kinds = Schema.optionalKey(
  Schema.Array(Schema.Literals(SIGNAL_KINDS)).annotate({
    description:
      "consumed=見た・聴いた、endorsed=高評価・いいね、collected=マイリストや再生リストに保存、followed=フォロー・登録",
  }),
);

const Types = Schema.optionalKey(
  Schema.Array(Schema.Literals(SUBJECT_TYPES)).annotate({
    description: "対象の種類。video・track・album・playlist・episode・person・channel",
  }),
);

const SearchInput = Schema.Struct({
  keyword: Schema.optionalKey(
    Schema.String.annotate({
      description: "題名・投稿者やアーティストの名前・タグの部分一致。省略すると新しい順",
    }),
  ),
  kinds: Kinds,
  types: Types,
  providers: Providers,
  since: Instant,
  until: Instant,
  limit: Limit,
});

const ProfileInput = Schema.Struct({
  kinds: Kinds,
  types: Types,
  providers: Providers,
  since: Instant,
  until: Instant,
  limit: Limit,
});

const SimilarInput = Schema.Struct({
  text: Schema.optionalKey(
    Schema.NonEmptyString.annotate({
      description:
        "似たものを探す元の文。曲名・雰囲気・ジャンルなど何でもよい。subjectKey と同時には指定しない",
    }),
  ),
  subjectKey: Schema.optionalKey(
    Schema.NonEmptyString.annotate({
      description: "似たものを探す元の対象の key。taste_profile や search_signals が返したもの",
    }),
  ),
  limit: Limit,
});

const NoteInput = Schema.Struct({
  statements: Schema.NonEmptyArray(StatementSchema).annotate({
    description: "好みを述べた文の並び。1 文ごとに根拠の対象を付ける",
  }),
  coversUntil: Instant,
});

const EmptyInput = Schema.Struct({});

export { EmptyInput, NoteInput, ProfileInput, SearchInput, SimilarInput };
