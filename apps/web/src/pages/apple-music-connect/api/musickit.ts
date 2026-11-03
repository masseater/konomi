import { Effect, Option, Predicate, Schema, pipe } from "effect";

const APP = { name: "konomi", build: "1" } as const;

const taggedError = Schema.TaggedError;

class MusicKitFailed extends taggedError<MusicKitFailed, { readonly brand: unique symbol }>()(
  "MusicKitFailed",
  { message: Schema.String },
) {}

const failed = (message: string) => (): MusicKitFailed => MusicKitFailed.make({ message });

type Invocation = Readonly<{ target: unknown; name: string; args: readonly unknown[] }>;

const invocationOf = ({ target, name, args }: Invocation): Option.Option<() => Promise<unknown>> =>
  pipe(
    Option.liftPredicate(target, Predicate.isReadonlyObject),
    Option.map((found) => Reflect.get(found, name)),
    Option.filter(Predicate.isFunction),
    Option.map((method) => () => Promise.resolve(Reflect.apply(method, target, args))),
  );

const call = (invocation: Invocation): Effect.Effect<unknown, MusicKitFailed> =>
  pipe(
    invocationOf(invocation),
    Effect.fromOption,
    Effect.mapError(failed(`MusicKit がまだ読み込まれていない（${invocation.name} が無い）`)),
    Effect.flatMap((run) =>
      Effect.tryPromise({ try: run, catch: failed(`MusicKit の ${invocation.name} が失敗した`) }),
    ),
  );

const decodeToken = Schema.decodeUnknownEffect(Schema.NonEmptyString);

const authorizeMusicKit = (developerToken: string): Effect.Effect<string, MusicKitFailed> =>
  Effect.gen(function* authorize() {
    const musicKit: unknown = Reflect.get(globalThis, "MusicKit");
    const instance = yield* call({
      target: musicKit,
      name: "configure",
      args: [{ developerToken, app: APP }],
    });
    const token = yield* call({ target: instance, name: "authorize", args: [] });
    return yield* decodeToken(token).pipe(Effect.mapError(failed("Apple ID の許可が取れなかった")));
  });

export { authorizeMusicKit };
