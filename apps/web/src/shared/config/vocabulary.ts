export const PROVIDER_IDS = [
  "anilist",
  "annict",
  "apple-music",
  "bluesky",
  "filmarks",
  "github",
  "hatena",
  "kindle",
  "lastfm",
  "letterboxd",
  "listenbrainz",
  "mastodon",
  "misskey",
  "myanimelist",
  "netflix",
  "niconico",
  "openlibrary",
  "pinterest",
  "pixiv",
  "playstation",
  "prime-video",
  "qiita",
  "raindrop",
  "reddit",
  "soundcloud",
  "spotify",
  "steam",
  "trakt",
  "twilog",
  "twitch",
  "vocadb",
  "vrchat",
  "xbox",
  "youtube",
] as const;

export const SIGNAL_KINDS = ["consumed", "endorsed", "collected", "followed"] as const;

export const EVENT_SIGNAL_KINDS = ["consumed"] as const;

export const SUBJECT_TYPES = [
  "video",
  "track",
  "album",
  "playlist",
  "episode",
  "person",
  "channel",
  "game",
  "series",
  "movie",
  "book",
  "post",
  "artwork",
  "item",
  "world",
  "repository",
  "page",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type SignalKind = (typeof SIGNAL_KINDS)[number];

export type SubjectType = (typeof SUBJECT_TYPES)[number];
