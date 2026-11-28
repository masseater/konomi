import { McpServer } from "@modelcontextprotocol/server";
import { env } from "cloudflare:workers";
import { pipe } from "effect";

import { SITE_NAME } from "#/shared/config";

import { registerTools } from "./tools.server.ts";

export const buildServer = (): McpServer =>
  pipe(
    new McpServer({ name: SITE_NAME, version: "0.0.0", websiteUrl: env.SITE_ORIGIN }),
    registerTools,
  );
