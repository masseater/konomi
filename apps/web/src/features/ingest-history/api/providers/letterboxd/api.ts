const WEB = "https://letterboxd.com";
const FIELD = { user: "user" } as const;
const HEADERS = {
  "User-Agent": "konomi (self-hosted; https://github.com/masseater/konomi)",
} as const;
const LIKED = "Yes";
const LIKED_RATING = 4;

export { FIELD, HEADERS, LIKED, LIKED_RATING, WEB };
