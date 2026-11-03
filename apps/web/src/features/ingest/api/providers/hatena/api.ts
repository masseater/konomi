const WEB = "https://b.hatena.ne.jp";
const PAGE_SIZE = 20;
const FIELD = { user: "user" } as const;
const HEADERS = {
  "User-Agent": "konomi (self-hosted; https://github.com/masseater/konomi)",
} as const;

export { FIELD, HEADERS, PAGE_SIZE, WEB };
