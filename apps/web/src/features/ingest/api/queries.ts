import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { browserClient, createQueries, serverClient } from "#/shared/api";

import type { ConnectionRoutes } from "./routes.server";

const loadConnectionRoutes = (): Promise<ConnectionRoutes> =>
  Effect.runPromise(
    Effect.promise(() => import("./routes.server")).pipe(
      Effect.map((module) => module.connectionRoutes),
    ),
  );

const client = createIsomorphicFn()
  .server(() => serverClient<ConnectionRoutes>(loadConnectionRoutes))
  .client(() => browserClient<ConnectionRoutes>());

const connectionClient = client();

const connectionQueries = createQueries<ConnectionRoutes>(connectionClient);

export { connectionClient, connectionQueries };
