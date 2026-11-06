import { D1, Vectorize, Website, Workers, providers, state } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { withWorkersTracing } from "@r_masseater/workers-tracing/alchemy";
import { Stack, makeRandom } from "alchemy";
import { Config, Effect, Hash, Schema } from "effect";
import { SECURITY_HEADERS, STATIC_PAGE_HEADERS, assetHeaders } from "security-headers";

import { APP_NAME, requireAppPrefix } from "./app-name.ts";
import { EMBEDDING_DIMENSIONS } from "./src/shared/config/embedding.ts";

const WEB_LIMITS = { cpuMs: 1000 } as const;

const API_RATE_LIMIT = Workers.RateLimit("API_RATE_LIMIT", {
  namespaceId: Math.abs(Hash.string(APP_NAME)),
  simple: { limit: 100, period: 60 },
});

const CF_BEACON_TOKEN = "47d660a773db4bb7a9b283aaf8f080ff";

const INGEST_SCHEDULE = "17 * * * *";

const DEFAULT_DOMAIN = "konomi.masseater.dev";

const web = Effect.gen(function* web() {
  const DB = yield* D1.Database("DB", { migrations: "./drizzle" });
  const SUBJECT_VECTORS = yield* Vectorize.Index("SubjectVectors", {
    dimensions: EMBEDDING_DIMENSIONS,
    metric: "cosine",
  });
  const BETTER_AUTH_SECRET = yield* makeRandom("BetterAuthSecret");
  const CREDENTIAL_KEY = yield* makeRandom("CredentialKey");
  const domain = yield* Config.schema(Schema.NonEmptyString, "KONOMI_DOMAIN").pipe(
    Config.withDefault(DEFAULT_DOMAIN),
  );
  return yield* Website.Vite("Web", {
    domain,
    main: "src/app/server/main.worker.ts",
    crons: [INGEST_SCHEDULE],
    logpush: true,
    limits: WEB_LIMITS,
    env: {
      AI: Workers.AI(),
      API_RATE_LIMIT,
      BETTER_AUTH_SECRET,
      CF_BEACON_TOKEN,
      CREDENTIAL_KEY,
      DB,
      SITE_ORIGIN: `https://${domain}`,
      SUBJECT_VECTORS,
    },
    viteEnvironments: { entry: "ssr", children: ["rsc"] },
    assets: { headers: assetHeaders(SECURITY_HEADERS) },
  });
});

const landingPage = Website.StaticSite("LandingPage", {
  cwd: "../lp",
  env: { VITE_CF_BEACON_TOKEN: CF_BEACON_TOKEN },
  command: "vp run build",
  outdir: "dist/client",
  logpush: true,
  assets: { headers: assetHeaders(STATIC_PAGE_HEADERS) },
  dev: { command: "vp dev" },
});

type WebEnv = InferEnv<typeof web>;

export type { WebEnv };
export default Stack(
  APP_NAME,
  { providers: withWorkersTracing(providers()), state: state() },
  Effect.gen(function* stack() {
    const { url } = yield* web;
    const { url: landingPageUrl } = yield* landingPage;
    yield* requireAppPrefix;
    return { url, landingPageUrl };
  }),
);
