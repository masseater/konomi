import { Effect } from "effect";
import { Hex } from "effect/encoding";

const textEncoder = new TextEncoder();

export const digestHex = ({
  algorithm,
  text,
}: Readonly<{ algorithm: "SHA-1" | "SHA-256"; text: string }>): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest(algorithm, textEncoder.encode(text))).pipe(
    Effect.map((digest) => Hex.encode(new Uint8Array(digest))),
  );
