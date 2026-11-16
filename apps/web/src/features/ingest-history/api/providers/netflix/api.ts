const WEB = "https://www.netflix.com";
const FIELD = { profile: "profile" } as const;
const ACTIVITY_COLUMN = {
  profile: "Profile Name",
  startedAt: "Start Time",
  duration: "Duration",
  attributes: "Attributes",
  title: "Title",
  supplemental: "Supplemental Video Type",
} as const;
const HISTORY_COLUMN = { title: "Title", date: "Date" } as const;
const MIN_WATCHED_SEC = 60;
const AUTOPLAYED = "Autoplayed: user action: None";

export { ACTIVITY_COLUMN, AUTOPLAYED, FIELD, HISTORY_COLUMN, MIN_WATCHED_SEC, WEB };
