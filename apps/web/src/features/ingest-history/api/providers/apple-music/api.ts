export const API = "https://api.music.apple.com/v1";
export const WEB_ORIGIN = "https://music.apple.com";
export const RECENT_LIMIT = 30;
export const LIBRARY_LIMIT = 100;
export const LIBRARY_INTERVAL_MS = 86_400_000;
export const FIELD = {
  teamId: "teamId",
  keyId: "keyId",
  privateKey: "privateKey",
  userToken: "musicUserToken",
} as const;
