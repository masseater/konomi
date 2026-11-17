export const WEB = "https://openlibrary.org";
export const FIELD = { user: "user" } as const;
export const HEADERS = {
  "User-Agent": "konomi (self-hosted; https://github.com/masseater/konomi)",
} as const;
export const SHELVES = [
  { shelf: "already-read", kind: "consumed", context: "読んだ" },
  { shelf: "currently-reading", kind: "collected", context: "読んでいる" },
  { shelf: "want-to-read", kind: "collected", context: "読みたい" },
] as const;
