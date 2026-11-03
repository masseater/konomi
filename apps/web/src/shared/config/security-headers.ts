import { contentSecurityPolicy } from "security-headers";

const DOCUMENT_CACHE_CONTROL = "no-cache, no-store, must-revalidate";

const APPLE_MUSIC_CONNECT_PATH = "/connect/apple-music";

const APPLE_ORIGINS = ["https://*.apple.com"] as const;

const noncePolicy = (nonce: string): string =>
  contentSecurityPolicy({ script: [`'nonce-${nonce}'`], style: [`'nonce-${nonce}'`] });

const appleMusicPolicy = (nonce: string): string =>
  contentSecurityPolicy({
    script: [`'nonce-${nonce}'`, "https://js-cdn.music.apple.com"],
    style: [`'nonce-${nonce}'`],
    connect: APPLE_ORIGINS,
    frame: APPLE_ORIGINS,
  });

const APPLE_MUSIC_CONNECT_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Cross-Origin-Embedder-Policy": "unsafe-none",
} as const;

export {
  APPLE_MUSIC_CONNECT_HEADERS,
  APPLE_MUSIC_CONNECT_PATH,
  DOCUMENT_CACHE_CONTROL,
  appleMusicPolicy,
  noncePolicy,
};
