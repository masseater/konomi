import { Schema } from "effect";

import { authClient } from "#/shared/auth";

import { submitOf } from "./submit-of";

const HOME = "/";

const Credentials = Schema.Struct({ email: Schema.String, password: Schema.String });

export const signIn = submitOf(Schema.decodeUnknownEffect(Credentials))((credentials) =>
  authClient.signIn.email({ ...credentials, callbackURL: HOME, fetchOptions: { throw: true } }),
);
