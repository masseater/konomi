import { createFileRoute } from "@tanstack/react-router";

import { serveMcp } from "#/features/serve-mcp/index.server";

const handle = ({ request }: Readonly<{ request: Request }>): Promise<Response> =>
  serveMcp(request);

export const Route = createFileRoute("/mcp")({
  server: { handlers: { GET: handle, POST: handle, DELETE: handle } },
});
