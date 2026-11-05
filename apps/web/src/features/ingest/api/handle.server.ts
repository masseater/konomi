import { elysiaTracing, tracedHandle } from "@r_masseater/workers-tracing/elysia";

import { createRouter } from "#/shared/api/index.server";

import { connectionRoutes } from "./routes.server";

const handleConnections = tracedHandle(
  createRouter("").use(elysiaTracing).use(connectionRoutes).handle,
);

export { handleConnections };
