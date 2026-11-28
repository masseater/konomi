import type { McpServer } from "@modelcontextprotocol/server";
import { Effect, Option, pipe } from "effect";

import { listConnectionViews } from "#/entities/connection/index.server";
import {
  countByKind,
  findSignals,
  findSimilar,
  tasteProfile,
} from "#/entities/signal/index.server";
import type {
  KindCount,
  SignalFilter,
  SimilarSubject,
  Taste,
} from "#/entities/signal/index.server";

import { optionalMillis } from "./instant.ts";
import { readTasteNote, writeTasteNote } from "./taste-note.server.ts";
import { ToolError } from "./tool-error.ts";
import {
  EMPTY_SCHEMA,
  NOTE_SCHEMA,
  PROFILE_SCHEMA,
  SEARCH_SCHEMA,
  SIMILAR_SCHEMA,
} from "./tool-input.ts";
import type { SearchInput, SimilarInput } from "./tool-input.ts";
import { registerTool } from "./tool-registry.server.ts";

const DEFAULT_LIMIT = 30;
const SIMILAR_LIMIT = 20;
const PROFILE_METHOD =
  "lasting と recent は好みの度合いの占有率で、半減期 1 年と 30 日で古い反応を割り引いて足した。重みは見た・聴いた 1（同じ対象を何度も見ても対数で頭打ち）、高評価 2、保存 3、フォロー 3。投稿者とタグは、紐づく対象の度合いの合計。trend は recent が lasting の 1.5 倍以上で rising、2/3 以下で fading。rising は最近伸びているものの一覧";

type FilterInput = Readonly<Partial<typeof SearchInput.Type>>;

const filterOf = (input: FilterInput): Effect.Effect<SignalFilter, ToolError> =>
  Effect.all(
    { sinceMs: optionalMillis(input.since), untilMs: optionalMillis(input.until) },
    { concurrency: 1 },
  ).pipe(
    Effect.map(({ sinceMs, untilMs }) => ({
      keyword: Option.fromUndefinedOr(input.keyword),
      kinds: Option.fromUndefinedOr(input.kinds),
      types: Option.fromUndefinedOr(input.types),
      providers: Option.fromUndefinedOr(input.providers),
      sinceMs,
      untilMs,
      limit: input.limit ?? DEFAULT_LIMIT,
    })),
  );

type Profile = Readonly<{
  method: string;
  counts: readonly KindCount[];
  taste: Taste;
}>;

const profileOf = (filter: SignalFilter): Effect.Effect<Profile> =>
  Effect.all(
    {
      method: Effect.succeed(PROFILE_METHOD),
      counts: countByKind(filter),
      taste: tasteProfile(filter),
    },
    { concurrency: 1 },
  );

const similarOf = ({
  query,
  limit,
}: typeof SimilarInput.Type): Effect.Effect<readonly SimilarSubject[], ToolError> =>
  findSimilar({ ...query, limit: limit ?? SIMILAR_LIMIT }).pipe(
    Effect.catchTag("EmbeddingFailed", ({ message }) => Effect.fail(ToolError.make({ message }))),
  );

export const registerTools = (server: McpServer): McpServer =>
  pipe(
    server,
    registerTool({
      name: "find_similar",
      description:
        "文か対象の key から、意味の近い対象を持ち主の記録の中から探す。サービスをまたいだ同じ曲や、題名の違う同じ系統のものが見つかる。signals はその対象への持ち主の反応の数",
      input: SIMILAR_SCHEMA,
      run: similarOf,
    }),
    registerTool({
      name: "read_taste_note",
      description:
        "前に書いた好みのメモと、そのメモが読み終えた日時より後に増えた記録の数を返す。好みを語る前に読み、記録が増えていれば taste_profile と search_signals で確かめてから write_taste_note で書き直す",
      input: EMPTY_SCHEMA,
      run: () => readTasteNote,
    }),
    registerTool({
      name: "write_taste_note",
      description:
        "持ち主の好みを文で書き残す。1 文ごとに根拠の対象の key を付け、記録で確かめられたことだけを書く。人気や世間の評判で補わない。前のメモは履歴として残る",
      input: NOTE_SCHEMA,
      access: "write",
      run: writeTasteNote,
    }),
    registerTool({
      name: "search_signals",
      description:
        "持ち主が見た・聴いた・高評価した・保存した・フォローした記録を、サービスをまたいで語・種類・期間で探す。語を省くと新しい順に返す。具体的に何を見ていたかを確かめるときに使う",
      input: SEARCH_SCHEMA,
      run: (input) => filterOf(input).pipe(Effect.flatMap(findSignals)),
    }),
    registerTool({
      name: "taste_profile",
      description:
        "持ち主の好みを、作品・投稿者やアーティスト・タグごとの度合いで返す。長く続く好み（lasting）と最近の好み（recent）、伸びているもの（rising）が分かる。好みの全体像や変化をつかむときに最初に使い、具体的な記録は search_signals で確かめる",
      input: PROFILE_SCHEMA,
      run: (input) => filterOf(input).pipe(Effect.flatMap(profileOf)),
    }),
    registerTool({
      name: "list_connections",
      description:
        "サービスごとの取り込みの状態を返す。status が rejected ならログインが切れているので、持ち主に konomi のサイトでログイン情報を入れ直すよう伝える",
      input: EMPTY_SCHEMA,
      run: () => listConnectionViews,
    }),
  );
