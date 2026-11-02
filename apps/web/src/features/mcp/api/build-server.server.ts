import { McpServer } from "@modelcontextprotocol/server";
import { pipe } from "effect";

import { SITE_NAME } from "#/shared/config";
import { SITE_ORIGIN } from "#/shared/config/index.server";

import { registerTools } from "./tools.server";

const buildServer = (): McpServer =>
  pipe(
    new McpServer({ name: SITE_NAME, version: "0.0.0", websiteUrl: SITE_ORIGIN }),
    registerTools,
  );

export { buildServer };
