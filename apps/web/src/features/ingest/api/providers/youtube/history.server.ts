import { Array as Arr, Clock, Effect, Option, Schema, String as Str, pipe } from "effect";
import { Hex } from "effect/encoding";

import { postJson } from "#/features/ingest/api/providers/http.server";
import type { ProviderError } from "#/features/ingest/model/provider";

import { historyVideosOf } from "./history-videos";
import type { VideoParts } from "./subjects";

const ORIGIN = "https://www.youtube.com";
const BROWSE_URL = `${ORIGIN}/youtubei/v1/browse?prettyPrint=false`;
const CLIENT_NAME = "WEB";
const CLIENT_ID = "1";
const CLIENT_VERSION = "2.20260708.00.00";
const MS_PER_SECOND = 1000;
const COOKIE_SEPARATOR = ";";
const PAIR_SEPARATOR = "=";
const SID_COOKIES = [
  ["SAPISIDHASH", "SAPISID"],
  ["SAPISID1PHASH", "__Secure-1PAPISID"],
  ["SAPISID3PHASH", "__Secure-3PAPISID"],
] as const;

const BrowseRequest = Schema.Struct({
  context: Schema.Struct({
    client: Schema.Struct({
      clientName: Schema.String,
      clientVersion: Schema.String,
      hl: Schema.String,
      gl: Schema.String,
    }),
  }),
  browseId: Schema.String,
});

const textEncoder = new TextEncoder();

const cookieOf =
  (cookie: string) =>
  (name: string): Option.Option<string> =>
    pipe(
      Str.split(cookie, COOKIE_SEPARATOR),
      Arr.map(Str.trim),
      Arr.findFirst(Str.startsWith(`${name}${PAIR_SEPARATOR}`)),
      Option.map(Str.slice(name.length + PAIR_SEPARATOR.length)),
    );

const sha1Of = (text: string): Effect.Effect<string> =>
  Effect.promise(() => crypto.subtle.digest("SHA-1", textEncoder.encode(text))).pipe(
    Effect.map((digest) => Hex.encode(new Uint8Array(digest))),
  );

const authorizationOf = (cookie: string): Effect.Effect<string, ProviderError> =>
  Effect.gen(function* authorization() {
    const seconds = Math.round((yield* Clock.currentTimeMillis) / MS_PER_SECOND);
    const valueOf = cookieOf(cookie);
    const present = pipe(
      SID_COOKIES,
      Arr.map(([scheme, name]) =>
        pipe(
          valueOf(name),
          Option.map((sid) => ({ scheme, sid })),
        ),
      ),
      Arr.getSomes,
    );
    const parts = yield* pipe(
      present,
      Effect.forEach(({ scheme, sid }) =>
        sha1Of(`${seconds} ${sid} ${ORIGIN}`).pipe(
          Effect.map((hash) => `${scheme} ${seconds}_${hash}`),
        ),
      ),
    );
    return Arr.join(parts, " ");
  });

const pullHistory = (cookie: string): Effect.Effect<readonly VideoParts[], ProviderError> =>
  Effect.gen(function* history() {
    const authorization = yield* authorizationOf(cookie);
    const page = yield* postJson({
      url: BROWSE_URL,
      headers: {
        Cookie: cookie,
        Authorization: authorization,
        Origin: ORIGIN,
        "X-Origin": ORIGIN,
        "X-Goog-AuthUser": "0",
        "X-Youtube-Client-Name": CLIENT_ID,
        "X-Youtube-Client-Version": CLIENT_VERSION,
      },
      payload: BrowseRequest,
      body: {
        context: {
          client: { clientName: CLIENT_NAME, clientVersion: CLIENT_VERSION, hl: "ja", gl: "JP" },
        },
        browseId: "FEhistory",
      },
      schema: Schema.Unknown,
    });
    return historyVideosOf(page);
  }).pipe(Effect.withSpan("youtube.history"));

export { cookieOf, pullHistory };
