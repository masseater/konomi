import { Effect, Record, Schema } from "effect";

import { authClient } from "#/shared/auth";

const HOME = "/";

const Owner = Schema.Struct({
  name: Schema.NonEmptyString,
  email: Schema.String,
  password: Schema.String,
});

const signUp = (form: Readonly<FormData>): Promise<unknown> =>
  Effect.runPromise(
    Schema.decodeUnknownEffect(Owner)(Record.fromEntries(form)).pipe(
      Effect.flatMap((owner) =>
        Effect.promise(() =>
          authClient.signUp.email({ ...owner, callbackURL: HOME, fetchOptions: { throw: true } }),
        ),
      ),
    ),
  );

export { signUp };
