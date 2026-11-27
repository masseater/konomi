import { Effect, Match, Option, Schema, pipe } from "effect";

export type StateSchema = Schema.Top &
  Readonly<{ DecodingServices: never; EncodingServices: never }>;

const NEVER = 0;

export const cursorStateOf =
  <State extends StateSchema>(schema: State) =>
  (
    initial: State["Type"],
  ): Readonly<{
    read: (cursor: string) => State["Type"];
    write: (state: State["Type"]) => Effect.Effect<string>;
  }> => {
    const json = Schema.fromJsonString(schema);
    const decode = Schema.decodeUnknownOption(json);
    const encode = Schema.encodeEffect(json);
    return {
      read: (cursor) =>
        pipe(
          decode(cursor),
          Option.getOrElse(() => initial),
        ),
      write: (state) => encode(state).pipe(Effect.orDie),
    };
  };

export const scheduleOf = ({
  at,
  now,
  every,
}: Readonly<{ at: number | undefined; now: number; every: number }>): Readonly<{
  due: boolean;
  stamp: number;
  whenDue: <Item, Failure, Context>(
    pull: Effect.Effect<readonly Item[], Failure, Context>,
  ) => Effect.Effect<readonly Item[], Failure, Context>;
}> => {
  const last = at ?? NEVER;
  const due = now - last >= every;
  return {
    due,
    stamp: Match.value(due).pipe(
      Match.when(true, () => now),
      Match.orElse(() => last),
    ),
    whenDue: (pull) =>
      Match.value(due).pipe(
        Match.when(true, () => pull),
        Match.orElse(() => Effect.succeed([])),
      ),
  };
};
