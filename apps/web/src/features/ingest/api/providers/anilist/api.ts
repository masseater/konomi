const API = "https://graphql.anilist.co";
const LIMIT = 50;
const FIELD = { user: "user" } as const;
const MEDIA_TYPES = ["ANIME", "MANGA"] as const;

export { API, FIELD, LIMIT, MEDIA_TYPES };
