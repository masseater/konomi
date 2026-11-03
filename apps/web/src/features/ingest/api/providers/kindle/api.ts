const STORE = "https://www.amazon.co.jp/dp";
const LIBRARY_COLUMN = {
  asin: "ASIN",
  title: "Product Name",
  resourceType: "Resource Type",
  ownership: "Ownership Type",
  acquiredAt: "Relationship Creation Date",
  series: "Series Title",
} as const;
const SESSION_COLUMN = {
  asin: "ASIN",
  title: "product_name",
  startedAt: "start_time",
  readMs: "total_reading_milliseconds",
} as const;
const OWNED_ITEM = { resourceType: "ITEM", ownership: "Item Owner" } as const;
const MIN_READ_MS = 60_000;

export { LIBRARY_COLUMN, MIN_READ_MS, OWNED_ITEM, SESSION_COLUMN, STORE };
