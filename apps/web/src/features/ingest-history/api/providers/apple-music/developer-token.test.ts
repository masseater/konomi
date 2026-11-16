import { run } from "@r_masseater/workers-tracing/effect";
import { Effect } from "effect";
import { Base64 } from "effect/encoding";
import { decodeProtectedHeader, exportSPKI, importSPKI, jwtVerify } from "jose";
import { describe, expect, it } from "vite-plus/test";

import { signDeveloperToken } from "./developer-token.server";

const ALGORITHM = "ES256";
const TEAM_ID = "TEAM123456";
const KEY_ID = "KEY1234567";

const pemOf = (base64: string): string =>
  `-----BEGIN PRIVATE KEY-----\n${base64}\n-----END PRIVATE KEY-----`;

const signAndVerify = Effect.gen(function* signAndVerify() {
  const pair = yield* Effect.promise(() =>
    crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]),
  );
  const der = yield* Effect.promise(() => crypto.subtle.exportKey("pkcs8", pair.privateKey));
  const encoded = Base64.encode(new Uint8Array(der));
  const token = yield* signDeveloperToken({
    method: "musickit",
    fields: {
      teamId: TEAM_ID,
      keyId: KEY_ID,
      privateKey: pemOf(encoded),
    },
  });
  const spki = yield* Effect.promise(() => exportSPKI(pair.publicKey));
  const publicKey = yield* Effect.promise(() => importSPKI(spki, ALGORITHM));
  const verified = yield* Effect.promise(() => jwtVerify(token, publicKey, { issuer: TEAM_ID }));
  return { header: decodeProtectedHeader(token), expiry: typeof verified.payload.exp };
});

describe("signDeveloperToken", () => {
  it("signs an ES256 token that the key's public half verifies", () =>
    expect(run(signAndVerify)).resolves.toStrictEqual({
      header: { alg: ALGORITHM, kid: KEY_ID },
      expiry: "number",
    }));
});
