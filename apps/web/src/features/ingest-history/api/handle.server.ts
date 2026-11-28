import { createRouter } from "#/shared/api/index.server";

import { connectionRoutes } from "./routes.server.ts";

export const handleConnections = createRouter("").use(connectionRoutes).handle;
