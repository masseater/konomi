import { Effect, Logger, ManagedRuntime } from "effect";

import { cloudflareLogger, withCloudflareTracing } from "./tracing.server";

const runtime = ManagedRuntime.make(Logger.layer([cloudflareLogger]));

const runRequest = <Success>(effect: Effect.Effect<Success>): Promise<Success> =>
  effect.pipe(
    Effect.tapCause((cause) => Effect.logError("request failed", cause)),
    withCloudflareTracing,
    (traced) => runtime.runPromise(traced),
  );

export { runRequest };
