import { Clock, Effect } from "effect";
import { SignJWT, importPKCS8 } from "jose";

import type { Credential } from "#/entities/connection";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { CredentialRejected } from "#/features/ingest/model/credential-rejected";

import { FIELD } from "./api";

const ALGORITHM = "ES256";
const TOKEN_TTL_SECONDS = 43_200;
const MS_PER_SECOND = 1000;

const signDeveloperToken = (credential: Credential): Effect.Effect<string, CredentialRejected> =>
  Effect.gen(function* sign() {
    const teamId = yield* requireField(credential, FIELD.teamId);
    const keyId = yield* requireField(credential, FIELD.keyId);
    const privateKey = yield* requireField(credential, FIELD.privateKey);
    const issuedAt = Math.floor((yield* Clock.currentTimeMillis) / MS_PER_SECOND);
    const key = yield* Effect.tryPromise({
      try: () => importPKCS8(privateKey, ALGORITHM),
      catch: () => CredentialRejected.make({ message: "MusicKit の秘密鍵が読めない" }),
    });
    return yield* Effect.promise(() =>
      new SignJWT({})
        .setProtectedHeader({ alg: ALGORITHM, kid: keyId })
        .setIssuer(teamId)
        .setIssuedAt(issuedAt)
        .setExpirationTime(issuedAt + TOKEN_TTL_SECONDS)
        .sign(key),
    );
  }).pipe(Effect.withSpan("apple-music.developer-token"));

export { signDeveloperToken };
