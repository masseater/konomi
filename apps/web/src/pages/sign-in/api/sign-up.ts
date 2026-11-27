import { Schema } from "effect";

import { authClient } from "#/shared/auth";

import { submitOf } from "./submit-of";

const HOME = "/";

const Owner = Schema.Struct({
  name: Schema.NonEmptyString,
  email: Schema.String,
  password: Schema.String,
});

export const signUp = submitOf(Schema.decodeUnknownEffect(Owner))((owner) =>
  authClient.signUp.email({ ...owner, callbackURL: HOME, fetchOptions: { throw: true } }),
);
