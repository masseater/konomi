import { Effect } from "effect";

import { syncAll } from "#/features/ingest/index.server";
import { runRequest } from "#/shared/observability/index.server";

const renderPage = (request: Request): Promise<Response> =>
  Effect.runPromise(
    Effect.promise(() => import("@tanstack/react-start/server-entry")).pipe(
      Effect.flatMap(({ default: pages }) =>
        Effect.promise(() => Promise.resolve(pages.fetch(request))),
      ),
    ),
  );

const worker: ExportedHandler = {
  fetch: renderPage,
  scheduled: (_controller, _env, context) => {
    context.waitUntil(runRequest(syncAll));
  },
};

export default worker;
