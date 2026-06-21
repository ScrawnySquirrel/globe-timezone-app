import { describe, it, expect, beforeAll } from "vitest";
import * as fc from "fast-check";
import { resolveTimezone, getPolygonsForTimezone, setDataset } from "./timezoneSelector";
import type { TimezoneFeatureCollection } from "../types/index";

function bbox(minLng: number, minLat: number, maxLng: number, maxLat: number): number[][] {
  return [[minLng,minLat],[maxLng,minLat],[maxLng,maxLat],[minLng,maxLat],[minLng,minLat]];
}

const FIXTURE: TimezoneFeatureCollection = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { tzid: "America/New_York" }, geometry: { type: "Polygon", coordinates: [bbox(-80,35,-70,45)] } },
    { type: "Feature", properties: { tzid: "Europe/London" }, geometry: { type: "Polygon", coordinates: [bbox(-5,50,2,58)] } },
    { type: "Feature", properties: { tzid: "Asia/Tokyo" }, geometry: { type: "MultiPolygon", coordinates: [[bbox(130,31,145,34)],[bbox(138,34,142,42)]] } },
  ],
};

beforeAll(() => setDataset(FIXTURE));

describe("resolveTimezone", () => {
  it("resolves NYC", () => expect(resolveTimezone({ lat: 40.7, lng: -74 }, FIXTURE)).toBe("America/New_York"));
  it("resolves London", () => expect(resolveTimezone({ lat: 51.5, lng: -0.1 }, FIXTURE)).toBe("Europe/London"));
  it("resolves Tokyo", () => expect(resolveTimezone({ lat: 35.7, lng: 139.7 }, FIXTURE)).toBe("Asia/Tokyo"));
  it("returns null for ocean", () => expect(resolveTimezone({ lat: 0, lng: -150 }, FIXTURE)).toBeNull());
  it("returns null for poles", () => expect(resolveTimezone({ lat: 90, lng: 0 }, FIXTURE)).toBeNull());
  it("uses cached dataset", () => expect(resolveTimezone({ lat: 51.5, lng: -0.1 })).toBe("Europe/London"));
});

describe("getPolygonsForTimezone", () => {
  it("returns rings for known tz", () => expect(getPolygonsForTimezone("America/New_York", FIXTURE).length).toBeGreaterThan(0));
  it("returns multiple for MultiPolygon", () => expect(getPolygonsForTimezone("Asia/Tokyo", FIXTURE).length).toBe(2));
  it("returns empty for unknown", () => expect(getPolygonsForTimezone("Nope", FIXTURE)).toEqual([]));
});

describe("Property: interior points resolve", () => {
  it("NYC bbox", () => {
    fc.assert(fc.property(
      fc.float({ min: Math.fround(-79.9), max: Math.fround(-70.1), noNaN: true }),
      fc.float({ min: Math.fround(35.1), max: Math.fround(44.9), noNaN: true }),
      (lng, lat) => expect(resolveTimezone({ lat, lng }, FIXTURE)).toBe("America/New_York")
    ), { numRuns: 100 });
  });
});

describe("Property: ocean yields null", () => {
  it("mid-Pacific", () => {
    fc.assert(fc.property(
      fc.float({ min: Math.fround(-170), max: Math.fround(-120), noNaN: true }),
      fc.float({ min: Math.fround(-30), max: Math.fround(30), noNaN: true }),
      (lng, lat) => expect(resolveTimezone({ lat, lng }, FIXTURE)).toBeNull()
    ), { numRuns: 100 });
  });
});
