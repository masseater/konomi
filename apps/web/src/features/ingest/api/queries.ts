import { run } from "@r_masseater/workers-tracing/effect";
import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { browserClient, createQueries, serverClient } from "#/shared/api";

import type { ConnectionRoutes } from "./routes.server";

const loadConnectionHandle = (): Promise<(request: Request) => Promise<Response>> =>
  run(
    Effect.promise(() => import("./handle.server")).pipe(
      Effect.map((module) => module.handleConnections),
    ),
  );

const client = createIsomorphicFn()
  .server(() => serverClient<ConnectionRoutes>(loadConnectionHandle))
  .client(() => browserClient<ConnectionRoutes>());

const connectionClient = client();

const connectionQueries = createQueries<ConnectionRoutes>(connectionClient);

export { connectionClient, connectionQueries };
