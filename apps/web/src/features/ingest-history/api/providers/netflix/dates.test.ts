import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { datesToEpochs } from "./dates";

const utc = (date: string): number => Date.parse(`${date}T00:00:00Z`);

describe("datesToEpochs", () => {
  it("reads year-first dates", () => {
    expect(datesToEpochs(["2026/10/23", "2026/9/1"])).toStrictEqual(
      Option.some([utc("2026-10-23"), utc("2026-09-01")]),
    );
  });

  it("tells month-first from day-first by a day above 12", () => {
    expect(datesToEpochs(["10/23/26", "10/2/26"])).toStrictEqual(
      Option.some([utc("2026-10-23"), utc("2026-10-02")]),
    );
    expect(datesToEpochs(["23/10/2026", "2/10/2026"])).toStrictEqual(
      Option.some([utc("2026-10-23"), utc("2026-10-02")]),
    );
  });

  it("uses the newest-first order to settle two-digit years", () => {
    expect(datesToEpochs(["26/10/23", "26/9/30", "25/12/31"])).toStrictEqual(
      Option.some([utc("2026-10-23"), utc("2026-09-30"), utc("2025-12-31")]),
    );
  });

  it("gives up when the order stays ambiguous", () => {
    expect(datesToEpochs(["3/4/26", "2/4/26"])).toStrictEqual(Option.none());
  });
});
