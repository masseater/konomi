const SERVICE = "https://bsky.social/xrpc";
const WEB = "https://bsky.app";
const LIMIT = 100;
const FIELD = { identifier: "identifier", appPassword: "appPassword" } as const;

export { FIELD, LIMIT, SERVICE, WEB };
