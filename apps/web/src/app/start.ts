import { createMiddleware, createStart } from "@tanstack/react-start";
import { Effect, Match, Option, Record as Rec } from "effect";
import { Base64 } from "effect/encoding";
import { SECURITY_HEADERS } from "security-headers";

import { withWebAnalytics } from "#/app/server/web-analytics.server";
import {
  APPLE_MUSIC_CONNECT_HEADERS,
  APPLE_MUSIC_CONNECT_PATH,
  DOCUMENT_CACHE_CONTROL,
  SEARCH_INDEX_ORIGIN,
  appleMusicPolicy,
  noncePolicy,
} from "#/shared/config";

const NONCE_BYTES = 16;

const pageHeadersOf = (pathname: string, nonce: string): Readonly<Record<string, string>> =>
  Match.value(pathname === APPLE_MUSIC_CONNECT_PATH).pipe(
    Match.when(true, () => ({
      ...APPLE_MUSIC_CONNECT_HEADERS,
      "Content-Security-Policy": appleMusicPolicy(nonce),
    })),
    Match.orElse(() => ({ "Content-Security-Policy": noncePolicy(nonce) })),
  );

const robotsHeaders: Readonly<Record<string, string>> = Option.match(SEARCH_INDEX_ORIGIN, {
  onNone: () => ({ "X-Robots-Tag": "noindex" }),
  onSome: () => ({}),
});

const responseHeaders = createMiddleware().server(({ next, request }) =>
  Effect.runPromise(
    Effect.gen(function* secure() {
      const nonce = Base64.encode(crypto.getRandomValues(new Uint8Array(NONCE_BYTES)));
      const result = yield* Effect.promise(() => Promise.resolve(next({ context: { nonce } })));
      const secured = new Response(withWebAnalytics(result.response).body, result.response);
      const headers = {
        ...SECURITY_HEADERS,
        ...pageHeadersOf(new URL(request.url).pathname, nonce),
        "Cache-Control": DOCUMENT_CACHE_CONTROL,
        ...robotsHeaders,
      };
      for (const [name, value] of Rec.toEntries(headers)) {
        secured.headers.set(name, value);
      }
      return { ...result, response: secured };
    }),
  ),
);

const startInstance = createStart(() => ({
  requestMiddleware: [responseHeaders],
}));

export { startInstance };
