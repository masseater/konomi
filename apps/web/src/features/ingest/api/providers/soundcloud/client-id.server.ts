import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";

import { fetchText } from "#/features/ingest/api/providers/http.server";
import type { ProviderError } from "#/features/ingest/model/provider";
import { ProviderUnavailable } from "#/features/ingest/model/provider-unavailable";

const WEB_URL = "https://soundcloud.com";
const SCRIPT = /<script[^>]+src="(?<src>https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/gu;
const CLIENT_ID = /[{,]client_id:"(?<clientId>\w+)"/u;

const scriptsOf = (page: string): readonly string[] =>
  pipe(
    page,
    Str.matchAll(SCRIPT),
    Arr.fromIterable,
    Arr.map(({ groups }) => Option.fromUndefinedOr(groups)),
    Arr.getSomes,
    Arr.map(({ src }) => Option.fromUndefinedOr(src)),
    Arr.getSomes,
    Arr.reverse,
  );

const clientIdIn = (script: string): Option.Option<string> =>
  pipe(
    Option.fromNullishOr(CLIENT_ID.exec(script)),
    Option.flatMap(({ groups }) => Option.fromUndefinedOr(groups)),
    Option.flatMap(({ clientId }) => Option.fromUndefinedOr(clientId)),
  );

const scrapeClientId: Effect.Effect<string, ProviderError> = Effect.gen(function* scrape() {
  const page = yield* fetchText({ url: WEB_URL, headers: {} });
  for (const src of scriptsOf(page)) {
    const found = clientIdIn(yield* fetchText({ url: src, headers: {} }));
    if (Option.isSome(found)) {
      return found.value;
    }
  }
  return yield* ProviderUnavailable.make({
    message: "soundcloud.com no longer exposes a client_id",
  });
}).pipe(Effect.withSpan("soundcloud.client-id"));

export { scrapeClientId };
