import type { McpServer } from "@modelcontextprotocol/server";
import { DateTime, Effect, Option, Schema, pipe } from "effect";

import {
  countByCreator,
  countBySourceAndKind,
  findActivities,
} from "#/entities/activity/index.server";
import type { ActivityFilter } from "#/entities/activity/index.server";

import { ToolError } from "./tool-error";
import { SearchInput, SummaryInput } from "./tool-input";
import { runTool } from "./tool-result.server";

const DEFAULT_LIMIT = 50;
const READ_ONLY = { readOnlyHint: true, openWorldHint: false };
const SEARCH_SCHEMA = SearchInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);
const SUMMARY_SCHEMA = SummaryInput.pipe(Schema.toStandardSchemaV1, Schema.toStandardJSONSchemaV1);

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

const filterOf = (input: FilterInput): Effect.Effect<ActivityFilter, ToolError> =>
  Effect.all({ sinceMs: optionalMillis(input.since), untilMs: optionalMillis(input.until) }).pipe(
    Effect.map(({ sinceMs, untilMs }) => ({
      keyword: Option.fromUndefinedOr(input.keyword),
      sources: Option.fromUndefinedOr(input.sources),
      kinds: Option.fromUndefinedOr(input.kinds),
      sinceMs,
      untilMs,
      limit: input.limit ?? DEFAULT_LIMIT,
    })),
  );

const summaryOf = (
  filter: ActivityFilter,
): Effect.Effect<Readonly<{ totals: unknown; topCreators: unknown }>> =>
  Effect.all({ totals: countBySourceAndKind(), topCreators: countByCreator(filter) });

const registerTools = (server: McpServer): McpServer => {
  server.registerTool(
    "search_activity",
    {
      description:
        "持ち主が見た・高評価した・保存した・フォローした記録を、語・サービス・種類・期間で探す。語を省くと新しい順に返す。好みや最近の関心を知りたいときに使う",
      inputSchema: SEARCH_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) => runTool(filterOf(input).pipe(Effect.flatMap(findActivities))),
  );
  server.registerTool(
    "taste_summary",
    {
      description:
        "サービスと種類ごとの記録の件数と、よく見ている投稿者・アーティストの順位を返す。持ち主の好みの全体像をつかむときに最初に使う",
      inputSchema: SUMMARY_SCHEMA,
      annotations: READ_ONLY,
    },
    (input) => runTool(filterOf(input).pipe(Effect.flatMap(summaryOf))),
  );
  return server;
};

export { registerTools };
