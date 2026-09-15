import { describe, expect, it } from "vitest";
import { getDatePreset } from "./adminMonitoring";

describe("admin date presets", () => {
  const now = new Date("2026-08-26T10:00:00+07:00");
  it("returns an inclusive seven-day window", () => expect(getDatePreset("last7", now)).toEqual({ startDate: "2026-08-20", endDate: "2026-08-26" }));
  it("returns the current calendar month", () => expect(getDatePreset("month", now)).toEqual({ startDate: "2026-08-01", endDate: "2026-08-26" }));
  it("returns a thirty-day default monitoring window", () => expect(getDatePreset("last30", now)).toEqual({ startDate: "2026-07-28", endDate: "2026-08-26" }));
});
