const API = "https://api.listenbrainz.org/1";
const MUSICBRAINZ = "https://musicbrainz.org";
const LIMIT = 100;
const LOVED = 1;
const FIELD = { user: "user" } as const;
const HEADERS = {
  "User-Agent": "konomi (self-hosted; https://github.com/masseater/konomi)",
} as const;

export { API, FIELD, HEADERS, LIMIT, LOVED, MUSICBRAINZ };
