import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";

import { auth } from "#/shared/auth/index.server";
import { MCP_URL } from "#/shared/config/index.server";

import { buildServer } from "./build-server.server";

const serveMcp = (request: Request): Promise<Response> =>
  requireMcpAuth(auth, (authorized) => createMcpHandler(buildServer).fetch(authorized), {
    resource: MCP_URL,
  })(request);

export { serveMcp };
