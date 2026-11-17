export const STORE_SEARCH = "https://www.amazon.co.jp/s";
export const VIEWING_COLUMN = {
  title: "Title",
  startedAt: "Playback Start Datetime (UTC)",
  endedAt: "Playback End Datetime (UTC)",
  playbackHour: "Playback Hour",
  secondsViewed: "Seconds Viewed",
  material: "Material Type Description",
  videoType: "Video Type",
} as const;
export const NOT_VIEWING = ["promo", "trailer"] as const;
export const MIN_WATCHED_SEC = 60;
