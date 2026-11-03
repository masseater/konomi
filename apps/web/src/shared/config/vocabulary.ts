const PROVIDER_IDS = [
  "anilist",
  "annict",
  "apple-music",
  "bluesky",
  "filmarks",
  "github",
  "hatena",
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

const SIGNAL_KINDS = ["consumed", "endorsed", "collected", "followed"] as const;

const EVENT_SIGNAL_KINDS = ["consumed"] as const;

const SUBJECT_TYPES = [
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

type ProviderId = (typeof PROVIDER_IDS)[number];

type SignalKind = (typeof SIGNAL_KINDS)[number];

type SubjectType = (typeof SUBJECT_TYPES)[number];

export type { ProviderId, SignalKind, SubjectType };
export { EVENT_SIGNAL_KINDS, PROVIDER_IDS, SIGNAL_KINDS, SUBJECT_TYPES };
