import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { durationFromMs, durationOf, publishedOf } from "./subject-fields";

const TRACK_MS = 215_400;
const TRACK_SECONDS = 215;
const RELEASED = "2024-05-01";
const RELEASED_MS = Date.parse(RELEASED);

describe("subject fields", () => {
  it("rounds milliseconds to seconds and leaves the field out when unknown", () => {
    expect(durationFromMs(Option.some(TRACK_MS))).toStrictEqual({ durationSec: TRACK_SECONDS });
    expect(durationOf(Option.none())).toStrictEqual({});
  });

  it("keeps only dates that parse", () => {
    expect(publishedOf(Option.some(RELEASED))).toStrictEqual({ publishedAtMs: RELEASED_MS });
    expect(publishedOf(Option.some("unknown"))).toStrictEqual({});
  });
});
