import { env } from "cloudflare:workers";

const MCP_PATH = "/mcp";

const { SITE_ORIGIN } = env;

const MCP_URL = `${SITE_ORIGIN}${MCP_PATH}`;

export { MCP_URL, SITE_ORIGIN };
