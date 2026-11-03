import { DateTime, Effect, Option, pipe } from "effect";

import { ToolError } from "./tool-error";

const epochMillisOf = (text: string): Effect.Effect<number, ToolError> =>
  Effect.fromOption(DateTime.make(text)).pipe(
    Effect.mapBoth({
      onSuccess: DateTime.toEpochMillis,
      onFailure: () => ToolError.make({ message: `not a date: ${text}` }),
    }),
  );

const optionalMillis = (
  text: string | undefined,
): Effect.Effect<Option.Option<number>, ToolError> =>
  pipe(Option.fromUndefinedOr(text), Option.map(epochMillisOf), Effect.transposeOption);

export { optionalMillis };
