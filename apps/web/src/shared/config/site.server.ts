import { env } from "cloudflare:workers";

const MCP_PATH = "/mcp";

export const MCP_URL = `${env.SITE_ORIGIN}${MCP_PATH}`;
