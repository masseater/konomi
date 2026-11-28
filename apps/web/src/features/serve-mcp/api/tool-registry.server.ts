import type { McpServer, StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import type { Effect } from "effect";
import { Function as Fn } from "effect";

import type { ToolError } from "./tool-error";
import { runTool } from "./tool-result.server";

const BINARY = 2;
const ANNOTATIONS = {
  read: { readOnlyHint: true, openWorldHint: false },
  write: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
};

export type Access = keyof typeof ANNOTATIONS;

export const registerTool: {
  <Input, Output>(
    tool: Readonly<{
      name: string;
      description: string;
      input: StandardSchemaWithJSON<Input, Output>;
      access?: Access;
      run: (args: Output) => Effect.Effect<unknown, ToolError>;
    }>,
  ): (server: McpServer) => McpServer;
  <Input, Output>(
    server: McpServer,
    tool: Readonly<{
      name: string;
      description: string;
      input: StandardSchemaWithJSON<Input, Output>;
      access?: Access;
      run: (args: Output) => Effect.Effect<unknown, ToolError>;
    }>,
  ): McpServer;
} = Fn.dual(
  BINARY,
  <Input, Output>(
    server: McpServer,
    {
      name,
      description,
      input,
      access = "read",
      run,
    }: Readonly<{
      name: string;
      description: string;
      input: StandardSchemaWithJSON<Input, Output>;
      access?: Access;
      run: (args: Output) => Effect.Effect<unknown, ToolError>;
    }>,
  ): McpServer => {
    server.registerTool<StandardSchemaWithJSON, StandardSchemaWithJSON<Input, Output>>(
      name,
      { description, inputSchema: input, annotations: ANNOTATIONS[access] },
      (args) => runTool(run(args)),
    );
    return server;
  },
);
