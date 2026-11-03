import type { McpServer } from "@modelcontextprotocol/server";
import { Effect, Option, Schema } from "effect";

import { listConnectionViews } from "#/entities/connection/index.server";
import { countByKind, findSignals, tasteProfile } from "#/entities/signal/index.server";
import type { KindCount, SignalFilter, Taste } from "#/entities/signal/index.server";

import { optionalMillis } from "./instant";
import { registerTasteTools } from "./taste-tools.server";
import type { ToolError } from "./tool-error";
import { EmptyInput, ProfileInput, SearchInput } from "./tool-input";
import { runTool } from "./tool-result.server";

const DEFAULT_LIMIT = 30;
const PROFILE_METHOD =
  "lasting と recent は好みの度合いの占有率で、半減期 1 年と 30 日で古い反応を割り引いて足した。重みは見た・聴いた 1（同じ対象を何度も見ても対数で頭打ち）、高評価 2、保存 3、フォロー 3。投稿者とタグは、紐づく対象の度合いの合計。trend は recent が lasting の 1.5 倍以上で rising、2/3 以下で fading。rising は最近伸びているものの一覧";
const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
const SEARCH_SCHEMA = SearchInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const PROFILE_SCHEMA = ProfileInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const EMPTY_SCHEMA = EmptyInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

type FilterInput = Readonly<Partial<typeof SearchInput.Type>>;

const filterOf = (input: FilterInput): Effect.Effect<SignalFilter, ToolError> =>
  Effect.all({ sinceMs: optionalMillis(input.since), untilMs: optionalMillis(input.until) }).pipe(
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
  Effect.all({
    method: Effect.succeed(PROFILE_METHOD),
    counts: countByKind(filter),
    taste: tasteProfile(filter),
  });

const registerTools = (server: McpServer): McpServer => {
  registerTasteTools(server);
  server.registerTool(
    "search_signals",
    {
      description:
        "持ち主が見た・聴いた・高評価した・保存した・フォローした記録を、サービスをまたいで語・種類・期間で探す。語を省くと新しい順に返す。具体的に何を見ていたかを確かめるときに使う",
      inputSchema: SEARCH_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) => runTool(filterOf(input).pipe(Effect.flatMap(findSignals))),
  );
  server.registerTool(
    "taste_profile",
    {
      description:
        "持ち主の好みを、作品・投稿者やアーティスト・タグごとの度合いで返す。長く続く好み（lasting）と最近の好み（recent）、伸びているもの（rising）が分かる。好みの全体像や変化をつかむときに最初に使い、具体的な記録は search_signals で確かめる",
      inputSchema: PROFILE_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) => runTool(filterOf(input).pipe(Effect.flatMap(profileOf))),
  );
  server.registerTool(
    "list_connections",
    {
      description:
        "サービスごとの取り込みの状態を返す。status が rejected ならログインが切れているので、持ち主に konomi のサイトでログイン情報を入れ直すよう伝える",
      inputSchema: EMPTY_SCHEMA,
      annotations: READ_ONLY,
    },
    () => runTool(listConnectionViews),
  );
  return server;
};

export { registerTools };
