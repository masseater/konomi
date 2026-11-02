import { Effect, Record, Schema } from "effect";

import { authClient } from "#/shared/auth";

const HOME = "/";

const Credentials = Schema.Struct({ email: Schema.String, password: Schema.String });

const signIn = (form: Readonly<FormData>): Promise<unknown> =>
  Effect.runPromise(
    Schema.decodeUnknownEffect(Credentials)(Record.fromEntries(form)).pipe(
      Effect.flatMap((credentials) =>
        Effect.promise(() =>
          authClient.signIn.email({
            ...credentials,
            callbackURL: HOME,
            fetchOptions: { throw: true },
          }),
        ),
      ),
    ),
  );

export { signIn };
