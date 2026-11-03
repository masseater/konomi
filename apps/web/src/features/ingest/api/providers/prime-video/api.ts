const STORE_SEARCH = "https://www.amazon.co.jp/s";
const VIEWING_COLUMN = {
  title: "Title",
  startedAt: "Playback Start Datetime (UTC)",
  endedAt: "Playback End Datetime (UTC)",
  playbackHour: "Playback Hour",
  secondsViewed: "Seconds Viewed",
  material: "Material Type Description",
  videoType: "Video Type",
} as const;
const NOT_VIEWING = ["promo", "trailer"] as const;
const MIN_WATCHED_SEC = 60;

export { MIN_WATCHED_SEC, NOT_VIEWING, STORE_SEARCH, VIEWING_COLUMN };
