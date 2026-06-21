import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { formatTimeInZone, safeFormatTimeInZone } from "./clockFormatter";

describe("formatTimeInZone", () => {
  it("returns correct format for NYC", () => {
    const epochMs = new Date("2024-01-15T19:30:00Z").getTime();
    expect(formatTimeInZone(epochMs, "America/New_York")).toBe("2024-01-15 14:30:00 America/New_York");
  });
  it("handles UTC", () => {
    const epochMs = new Date("2024-06-01T00:00:00Z").getTime();
    expect(formatTimeInZone(epochMs, "UTC")).toBe("2024-06-01 00:00:00 UTC");
  });
  it("handles London BST", () => {
    const epochMs = new Date("2024-07-15T12:00:00Z").getTime();
    expect(formatTimeInZone(epochMs, "Europe/London")).toBe("2024-07-15 13:00:00 Europe/London");
  });
  it("handles Tokyo", () => {
    const epochMs = new Date("2024-03-10T15:00:00Z").getTime();
    expect(formatTimeInZone(epochMs, "Asia/Tokyo")).toBe("2024-03-11 00:00:00 Asia/Tokyo");
  });
  it("throws RangeError for invalid tz", () => {
    expect(() => formatTimeInZone(Date.now(), "Not/A/Timezone")).toThrow(RangeError);
  });
});

describe("safeFormatTimeInZone", () => {
  it("returns formatted string for valid tz", () => {
    const epochMs = new Date("2024-01-15T19:30:00Z").getTime();
    expect(safeFormatTimeInZone(epochMs, "America/New_York")).toBe("2024-01-15 14:30:00 America/New_York");
  });
  it("returns null for invalid tz", () => {
    expect(safeFormatTimeInZone(Date.now(), "Fake/Timezone")).toBeNull();
  });
  it("does not throw", () => {
    expect(() => safeFormatTimeInZone(Date.now(), "Bad/Zone")).not.toThrow();
  });
});

describe("Property: output matches pattern", () => {
  const ZONES = ["UTC", "America/New_York", "Europe/London", "Asia/Tokyo"];
  it("always matches YYYY-MM-DD HH:mm:ss <tz>", () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 2_000_000_000_000 }),
      fc.constantFrom(...ZONES),
      (epochMs, tzId) => {
        const result = formatTimeInZone(epochMs, tzId);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} .+$/);
        expect(result.endsWith(` ${tzId}`)).toBe(true);
      }
    ), { numRuns: 100 });
  });
});

describe("Property: round-trip accuracy", () => {
  it("parsed UTC output is within 1s of original", () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 2_000_000_000_000 }),
      (epochMs) => {
        const result = formatTimeInZone(epochMs, "UTC");
        const [datePart, timePart] = result.split(" ");
        const parsed = new Date(`${datePart}T${timePart}Z`).getTime();
        expect(Math.abs(parsed - epochMs)).toBeLessThan(1000);
      }
    ), { numRuns: 100 });
  });
});
