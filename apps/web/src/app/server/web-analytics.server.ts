import { env } from "cloudflare:workers";
import { Array as Arr, Option, Record as Rec, String as Str, pipe } from "effect";
import { webAnalyticsBeacon } from "security-headers";

const escapeAttribute = (value: string): string =>
  pipe(value, Str.replaceAll("&", "&amp;"), Str.replaceAll('"', "&quot;"));

const attribute = ([name, value]: readonly [string, string | true]): string =>
  pipe(
    Option.liftPredicate(value, Str.isString),
    Option.match({
      onNone: () => name,
      onSome: (text) => `${name}="${escapeAttribute(text)}"`,
    }),
  );

const beaconTag = (token: string): Option.Option<string> =>
  pipe(
    webAnalyticsBeacon(token),
    Option.map(
      (beacon) =>
        `<script ${pipe(Rec.toEntries(beacon), Arr.map(attribute), Arr.join(" "))}></script>`,
    ),
  );

const injectBeacon =
  (tag: string) =>
  (response: Response): Response =>
    new HTMLRewriter()
      .on("head", {
        element: (head) => {
          head.append(tag, { html: true });
        },
      })
      .transform(response);

const withWebAnalytics = (response: Response): Response =>
  pipe(
    Option.fromNullishOr(response.headers.get("Content-Type")),
    Option.filter(Str.startsWith("text/html")),
    Option.flatMap(() => beaconTag(env.CF_BEACON_TOKEN)),
    Option.match({ onNone: () => response, onSome: (tag) => injectBeacon(tag)(response) }),
  );

export { withWebAnalytics };
