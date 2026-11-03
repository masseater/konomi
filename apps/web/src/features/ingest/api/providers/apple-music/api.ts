const API = "https://api.music.apple.com/v1";
const WEB_ORIGIN = "https://music.apple.com";
const RECENT_LIMIT = 30;
const LIBRARY_LIMIT = 100;
const LIBRARY_INTERVAL_MS = 86_400_000;
const FIELD = {
  teamId: "teamId",
  keyId: "keyId",
  privateKey: "privateKey",
  userToken: "musicUserToken",
} as const;

export { API, FIELD, LIBRARY_INTERVAL_MS, LIBRARY_LIMIT, RECENT_LIMIT, WEB_ORIGIN };
