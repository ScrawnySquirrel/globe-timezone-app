import type { GeoCoord, IANATimezone, TimezoneFeatureCollection, TimezonePolygon } from "../types/index";

let _cachedDataset: TimezoneFeatureCollection | null = null;

export function setDataset(dataset: TimezoneFeatureCollection): void {
  _cachedDataset = dataset;
}

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  const n = ring.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = ring[i]![0]!, yi = ring[i]![1]!;
    const xj = ring[j]![0]!, yj = ring[j]![1]!;
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(lng: number, lat: number, rings: number[][][]): boolean {
  if (rings.length === 0) return false;
  if (!pointInRing(lng, lat, rings[0]!)) return false;
  for (let h = 1; h < rings.length; h++) {
    if (pointInRing(lng, lat, rings[h]!)) return false;
  }
  return true;
}

export function resolveTimezone(coord: GeoCoord, dataset?: TimezoneFeatureCollection): IANATimezone | null {
  const data = dataset ?? _cachedDataset;
  if (!data) return null;
  const { lat, lng } = coord;
  for (const feature of data.features) {
    const { geometry, properties } = feature;
    if (geometry.type === "Polygon") {
      if (pointInPolygon(lng, lat, geometry.coordinates as number[][][])) return properties.tzid;
    } else if (geometry.type === "MultiPolygon") {
      for (const polygon of geometry.coordinates as number[][][][]) {
        if (pointInPolygon(lng, lat, polygon)) return properties.tzid;
      }
    }
  }
  return null;
}

export function getPolygonsForTimezone(tzId: IANATimezone, dataset?: TimezoneFeatureCollection): number[][][][] {
  const data = dataset ?? _cachedDataset;
  if (!data) return [];
  const results: number[][][][] = [];
  for (const feature of data.features) {
    if (feature.properties.tzid !== tzId) continue;
    const { geometry } = feature;
    if (geometry.type === "Polygon") results.push(geometry.coordinates as number[][][]);
    else if (geometry.type === "MultiPolygon") {
      for (const polygon of geometry.coordinates as number[][][][]) results.push(polygon);
    }
  }
  return results;
}

export function getFeatureForTimezone(tzId: IANATimezone, dataset?: TimezoneFeatureCollection): TimezonePolygon | null {
  const data = dataset ?? _cachedDataset;
  if (!data) return null;
  return (data.features.find((f) => f.properties.tzid === tzId) as TimezonePolygon) ?? null;
}
