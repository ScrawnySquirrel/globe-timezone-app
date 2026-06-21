/**
 * Shared TypeScript types and interfaces for the Globe Timezone App.
 */

import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type IANATimezone = string;

export interface GeoCoord {
  lat: number;
  lng: number;
}

export type FormattedTime = string;

export interface TimezoneFeatureProperties {
  tzid: IANATimezone;
}

export type TimezonePolygon = Feature<MultiPolygon | Polygon, TimezoneFeatureProperties>;

export type TimezoneFeatureCollection = FeatureCollection<MultiPolygon | Polygon, TimezoneFeatureProperties>;

export interface GlobeRendererOptions {
  polygonOpacity: number;
  polygonHoverOpacity: number;
  polygonHoverColor: string;
  polygonSelectedColor: string;
  minAltitude: number;
  maxAltitude: number;
}
