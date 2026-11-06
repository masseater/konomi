import { Array as Arr, Option, Record as Rec, Schema, pipe } from "effect";

const SECURITY_HEADERS = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
  "Cross-Origin-Resource-Policy": "same-origin",
} as const;

const ASSET_CACHE_CONTROL = "public, max-age=31536000, immutable";

const WEB_ANALYTICS_SCRIPT_ORIGIN = "https://static.cloudflareinsights.com";

const WEB_ANALYTICS_REPORT_ORIGIN = "https://cloudflareinsights.com";

const encodeBeaconConfig = Schema.encodeOption(
  Schema.fromJsonString(Schema.Struct({ token: Schema.String })),
);

type WebAnalyticsBeacon = Readonly<{
  src: string;
  defer: true;
  "data-cf-beacon": string;
}>;

const webAnalyticsBeacon = (token: string): Option.Option<WebAnalyticsBeacon> =>
  pipe(
    encodeBeaconConfig({ token }),
    Option.map((config) => ({
      src: `${WEB_ANALYTICS_SCRIPT_ORIGIN}/beacon.min.js`,
      defer: true,
      "data-cf-beacon": config,
    })),
  );

type PolicySources = Readonly<{
  script: readonly string[];
  style: readonly string[];
  connect?: readonly string[];
  frame?: readonly string[];
}>;

const contentSecurityPolicy = ({
  script,
  style,
  connect = [],
  frame = [],
}: PolicySources): string =>
  pipe(
    [
      "default-src 'self'",
      pipe(["script-src 'self'", WEB_ANALYTICS_SCRIPT_ORIGIN, ...script], Arr.join(" ")),
      pipe(["style-src 'self'", ...style], Arr.join(" ")),
      "img-src 'self' data:",
      pipe(["connect-src 'self'", WEB_ANALYTICS_REPORT_ORIGIN, ...connect], Arr.join(" ")),
      pipe(["frame-src 'self'", ...frame], Arr.join(" ")),
      "object-src 'none'",
      "base-uri 'none'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ],
    Arr.join("; "),
  );

const STATIC_PAGE_HEADERS = {
  ...SECURITY_HEADERS,
  "Content-Security-Policy": contentSecurityPolicy({ script: [], style: [] }),
} as const;

const assetHeaders = (pageHeaders: Readonly<Record<string, string>>): string =>
  pipe(
    [
      "/*",
      ...pipe(
        Rec.toEntries(pageHeaders),
        Arr.map(([name, value]) => `  ${name}: ${value}`),
      ),
      "/assets/*",
      `  Cache-Control: ${ASSET_CACHE_CONTROL}`,
      "",
    ],
    Arr.join("\n"),
  );

export type { PolicySources, WebAnalyticsBeacon };
export {
  SECURITY_HEADERS,
  STATIC_PAGE_HEADERS,
  assetHeaders,
  contentSecurityPolicy,
  webAnalyticsBeacon,
};
