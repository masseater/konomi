import type { McpServer } from "@modelcontextprotocol/server";
import { DateTime, Effect, Option, Schema, pipe } from "effect";

import { listConnectionViews } from "#/entities/connection/index.server";
import { countByKind, findSignals, topCreators, topTags } from "#/entities/signal/index.server";
import type {
  CreatorCount,
  KindCount,
  SignalFilter,
  TagCount,
} from "#/entities/signal/index.server";

import { ToolError } from "./tool-error";
import { EmptyInput, ProfileInput, SearchInput } from "./tool-input";
import { runTool } from "./tool-result.server";

const DEFAULT_LIMIT = 30;
const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
const SEARCH_SCHEMA = SearchInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const PROFILE_SCHEMA = ProfileInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const EMPTY_SCHEMA = EmptyInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

type FilterInput = Readonly<Partial<typeof SearchInput.Type>>;

const epochMillisOf = (text: string): Effect.Effect<number, ToolError> =>
  Effect.fromOption(DateTime.make(text)).pipe(
    Effect.mapBoth({
      onSuccess: DateTime.toEpochMillis,
      onFailure: () => ToolError.make({ message: `not a date: ${text}` }),
    }),
  );

const optionalMillis = (
  text: string | undefined,
): Effect.Effect<Option.Option<number>, ToolError> =>
  pipe(Option.fromUndefinedOr(text), Option.map(epochMillisOf), Effect.transposeOption);

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
  counts: readonly KindCount[];
  creators: readonly CreatorCount[];
  tags: readonly TagCount[];
}>;

const profileOf = (filter: SignalFilter): Effect.Effect<Profile> =>
  Effect.all({
    counts: countByKind(filter),
    creators: topCreators(filter),
    tags: topTags(filter),
  });

const registerTools = (server: McpServer): McpServer => {
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
        "サービス・対象の種類・反応の種類ごとの件数と、よく反応した投稿者やアーティスト、よく付いているタグの順位を返す。持ち主の好みの全体像や、期間ごとの変化をつかむときに最初に使う",
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
