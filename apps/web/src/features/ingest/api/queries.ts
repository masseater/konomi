import { createIsomorphicFn } from "@tanstack/react-start";
import { Effect } from "effect";

import { browserClient, createQueries, serverClient } from "#/shared/api";

import type { SourceRoutes } from "./routes.server";

const loadSourceRoutes = (): Promise<SourceRoutes> =>
  Effect.runPromise(
    Effect.promise(() => import("./routes.server")).pipe(
      Effect.map((module) => module.sourceRoutes),
    ),
  );

const client = createIsomorphicFn()
  .server(() => serverClient<SourceRoutes>(loadSourceRoutes))
  .client(() => browserClient<SourceRoutes>());

const sourceClient = client();

const sourceQueries = createQueries<SourceRoutes>(sourceClient);

export { sourceClient, sourceQueries };
