const STORE = "https://store.playstation.com";
const ME = "me";
const LIMIT = 200;
const FIELD = {
  npsso: "npsso",
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  expiresAtMs: "accessExpiresAtMs",
} as const;

export { FIELD, LIMIT, ME, STORE };
