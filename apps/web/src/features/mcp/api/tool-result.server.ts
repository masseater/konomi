import type { CallToolResult } from "@modelcontextprotocol/server";
import { Effect, Schema } from "effect";

import { runRequest } from "#/shared/observability/index.server";

import type { ToolError } from "./tool-error";

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const textResult = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
});

const errorResult = ({ message }: Readonly<{ message: string }>): CallToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

const runTool = <Value>(effect: Effect.Effect<Value, ToolError>): Promise<CallToolResult> =>
  runRequest(
    effect.pipe(
      Effect.flatMap(encodeJson),
      Effect.match({ onFailure: errorResult, onSuccess: textResult }),
    ),
  );

export { runTool };
