import type { CallToolResult } from "@modelcontextprotocol/server";
import { Effect } from "effect";

import { runRequest } from "#/shared/observability/index.server";

import type { ToolError } from "./tool-error";

const jsonResult = (value: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
});

const errorResult = ({ message }: Readonly<{ message: string }>): CallToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

const runTool = <Value>(effect: Effect.Effect<Value, ToolError>): Promise<CallToolResult> =>
  runRequest(effect.pipe(Effect.match({ onFailure: errorResult, onSuccess: jsonResult })));

export { runTool };
