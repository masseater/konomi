import { env } from "cloudflare:workers";
import { Effect } from "effect";
import { CompactEncrypt, compactDecrypt } from "jose";

const KEY_BITS = 256;
const KEY_INFO = "konomi/source-credential";
const ALGORITHMS = { alg: "dir", enc: "A256GCM" } as const;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const sealingKey: Effect.Effect<CryptoKey> = Effect.promise(() =>
  crypto.subtle.importKey("raw", textEncoder.encode(env.CREDENTIAL_KEY), "HKDF", false, [
    "deriveKey",
  ]),
).pipe(
  Effect.flatMap((base) =>
    Effect.promise(() =>
      crypto.subtle.deriveKey(
        {
          name: "HKDF",
          hash: "SHA-256",
          salt: new Uint8Array(),
          info: textEncoder.encode(KEY_INFO),
        },
        base,
        { name: "AES-GCM", length: KEY_BITS },
        false,
        ["encrypt", "decrypt"],
      ),
    ),
  ),
);

const withKey = <Out>(use: (key: CryptoKey) => Promise<Out>): Effect.Effect<Out> =>
  sealingKey.pipe(Effect.flatMap((key) => Effect.promise(() => use(key))));

export const sealSecret = (secret: string): Effect.Effect<string> =>
  withKey((key) =>
    new CompactEncrypt(textEncoder.encode(secret)).setProtectedHeader(ALGORITHMS).encrypt(key),
  );

export const openSecret = (sealed: string): Effect.Effect<string> =>
  withKey((key) =>
    compactDecrypt(sealed, key, {
      keyManagementAlgorithms: [ALGORITHMS.alg],
      contentEncryptionAlgorithms: [ALGORITHMS.enc],
    }),
  ).pipe(Effect.map(({ plaintext }) => textDecoder.decode(plaintext)));
