import { run } from "@r_masseater/workers-tracing/effect";
import { Effect, Record } from "effect";
import type { Schema } from "effect";

export const submitOf =
  <Fields>(decode: (input: unknown) => Effect.Effect<Fields, Schema.SchemaError>) =>
  (send: (fields: Fields) => Promise<unknown>) =>
  (form: Readonly<FormData>): Promise<unknown> =>
    run(
      decode(Record.fromEntries(form)).pipe(
        Effect.flatMap((fields) => Effect.promise(() => send(fields))),
      ),
    );
