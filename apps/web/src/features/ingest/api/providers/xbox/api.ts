const API = "https://api.xbl.io/v2";
const WEB = "https://www.xbox.com";
const FIELD = { apiKey: "apiKey" } as const;
const GAME = "Game";
const HEADERS = {
  "User-Agent": "konomi (self-hosted; https://github.com/masseater/konomi)",
} as const;

export { API, FIELD, GAME, HEADERS, WEB };
