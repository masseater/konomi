import { layer as workersTracing } from "@r_masseater/workers-tracing/effect";
import { Effect, ManagedRuntime } from "effect";

const runtime = ManagedRuntime.make(workersTracing);

const runRequest = <Success>(effect: Effect.Effect<Success>): Promise<Success> =>
  effect.pipe(
    Effect.tapCause((cause) => Effect.logError("request failed", cause)),
    (logged) => runtime.runPromise(logged),
  );

export { runRequest };
