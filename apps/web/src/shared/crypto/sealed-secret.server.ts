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

const sealSecret = (secret: string): Effect.Effect<string> =>
  sealingKey.pipe(
    Effect.flatMap((key) =>
      Effect.promise(() =>
        new CompactEncrypt(textEncoder.encode(secret)).setProtectedHeader(ALGORITHMS).encrypt(key),
      ),
    ),
  );

const openSecret = (sealed: string): Effect.Effect<string> =>
  sealingKey.pipe(
    Effect.flatMap((key) =>
      Effect.promise(() =>
        compactDecrypt(sealed, key, {
          keyManagementAlgorithms: [ALGORITHMS.alg],
          contentEncryptionAlgorithms: [ALGORITHMS.enc],
        }),
      ),
    ),
    Effect.map(({ plaintext }) => textDecoder.decode(plaintext)),
  );

export { openSecret, sealSecret };
