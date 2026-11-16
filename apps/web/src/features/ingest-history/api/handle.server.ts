import { createRouter } from "#/shared/api/index.server";

import { connectionRoutes } from "./routes.server";

const handleConnections = createRouter("").use(connectionRoutes).handle;

export { handleConnections };
