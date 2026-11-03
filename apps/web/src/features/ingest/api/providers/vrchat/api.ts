const API = "https://api.vrchat.cloud/api/1";
const WEB = "https://vrchat.com/home";
const LIMIT = 100;
const FIELD = { auth: "auth" } as const;
const AUTHOR_TAG = "author_tag_";
const HEADERS = {
  "User-Agent": "konomi/1.0.0 https://github.com/masseater/konomi",
} as const;

export { API, AUTHOR_TAG, FIELD, HEADERS, LIMIT, WEB };
