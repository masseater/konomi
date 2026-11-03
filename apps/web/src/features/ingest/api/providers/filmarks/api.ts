const WEB = "https://filmarks.com";
const FIELD = { user: "user" } as const;
const HEADERS = {
  "User-Agent": "konomi (self-hosted; https://github.com/masseater/konomi)",
} as const;
const LIKED_SCORE = 4;
const WATCHED = "観た";
const WANTED = "観たい";

export { FIELD, HEADERS, LIKED_SCORE, WANTED, WATCHED, WEB };
