const API = "https://api.myanimelist.net/v2";
const WEB = "https://myanimelist.net";
const LIMIT = 100;
const FIELD = { user: "user", clientId: "clientId" } as const;
const LISTS = ["anime", "manga"] as const;

export { API, FIELD, LIMIT, LISTS, WEB };
