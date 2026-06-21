import Globe from "globe.gl";
import type { GeoCoord, IANATimezone, TimezoneFeatureCollection } from "../types/index";
import { resolveTimezone } from "../utils/timezoneSelector";
import { safeFormatTimeInZone } from "../utils/clockFormatter";

type PointerCallback = (coord: GeoCoord | null) => void;

interface CountryFeature {
  type: string;
  properties: { name: string; [key: string]: unknown };
  geometry: { type: string; coordinates: unknown };
}

export class GlobeRenderer {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private globe: any;
  private dataset: TimezoneFeatureCollection | null = null;
  private countries: CountryFeature[] = [];
  private selectedCountryIdxs: Set<number> = new Set();
  private hoveredFeature: CountryFeature | null = null;
  private lastMouseEvent: MouseEvent | null = null;
  private _tooltipEl: HTMLElement | null = null;

  onPointerMove: PointerCallback | null = null;
  onPointerClick: PointerCallback | null = null;

  constructor(container: HTMLElement) {
    // globe.gl exports a constructor in its type defs but works as Globe()(el) at runtime
    // Use 'as any' to bypass the type mismatch between constructor signature and actual API
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.globe = (Globe as any)()(container)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-dark.jpg")
      .backgroundImageUrl("//unpkg.com/three-globe/example/img/night-sky.png")
      .width(container.clientWidth)
      .height(container.clientHeight)
      .polygonAltitude(0.006)
      .polygonSideColor(() => "rgba(0,0,0,0)")
      .polygonStrokeColor(() => "#444")
      .polygonsTransitionDuration(0)
      .polygonCapColor((feat: unknown) => this._getCapColor(feat as CountryFeature))
      .polygonLabel(() => "")
      .onPolygonHover((feat: unknown, _prev: unknown) => {
        const prev = this.hoveredFeature;
        this.hoveredFeature = (feat as CountryFeature) || null;
        container.style.cursor = feat ? "pointer" : "default";
        if (prev !== this.hoveredFeature) {
          this.globe.polygonCapColor(this.globe.polygonCapColor());
        }
        this._updateTooltip(feat as CountryFeature | null);
      })
      .onPolygonClick((feat: unknown, _ev: unknown, coords: { lat: number; lng: number }) => {
        if (!feat || !this.dataset) return;
        const coord: GeoCoord = { lat: coords.lat, lng: coords.lng };
        const tz = resolveTimezone(coord, this.dataset);
        if (tz && this.onPointerClick) this.onPointerClick(coord);
      });

    const resizeObserver = new ResizeObserver(() => {
      this.globe.width(container.clientWidth).height(container.clientHeight);
    });
    resizeObserver.observe(container);

    container.addEventListener("mousemove", (e: MouseEvent) => {
      this.lastMouseEvent = e;
      if (this._tooltipEl && this._tooltipEl.style.display !== "none") {
        this._tooltipEl.style.left = `${e.clientX}px`;
        this._tooltipEl.style.top = `${e.clientY}px`;
      }
    });
    container.addEventListener("mouseleave", () => {
      if (this._tooltipEl) this._tooltipEl.style.display = "none";
    });
  }

  loadDataset(dataset: TimezoneFeatureCollection): void { this.dataset = dataset; }

  loadCountries(geojson: { type: string; features: CountryFeature[] }): void {
    this.countries = geojson.features;
    this.globe.polygonsData(this.countries);
  }

  highlightTimezone(tzId: IANATimezone | null): void {
    this.selectedCountryIdxs.clear();
    if (tzId && this.dataset) {
      for (let i = 0; i < this.countries.length; i++) {
        const centroid = this._getCentroid(this.countries[i]!);
        if (centroid) {
          const tz = resolveTimezone(centroid, this.dataset);
          if (tz === tzId) this.selectedCountryIdxs.add(i);
        }
      }
    }
    this.globe.polygonCapColor(this.globe.polygonCapColor());
  }

  dispose(): void { this.globe?._destructor?.(); }

  private _getCapColor(f: CountryFeature): string {
    if (f === this.hoveredFeature) return "#ffaa00";
    const idx = this.countries.indexOf(f);
    if (this.selectedCountryIdxs.has(idx)) return "#ff5500";
    const hue = ((idx >= 0 ? idx : 0) * 137.508) % 360;
    return `hsl(${hue}, 40%, 32%)`;
  }

  private _updateTooltip(feat: CountryFeature | null): void {
    if (!feat) { if (this._tooltipEl) this._tooltipEl.style.display = "none"; return; }
    if (!this._tooltipEl) {
      this._tooltipEl = document.createElement("div");
      this._tooltipEl.style.cssText = "position:fixed;pointer-events:none;padding:6px 10px;background:rgba(0,0,0,0.85);border-radius:4px;color:#fff;font-family:monospace;font-size:13px;z-index:9999;white-space:nowrap;transform:translate(12px,-50%)";
      document.body.appendChild(this._tooltipEl);
    }
    const name = feat.properties.name || "Unknown";
    let timeStr = "";
    if (this.dataset && this.lastMouseEvent) {
      const el = this.globe.renderer().domElement;
      const rect = el.getBoundingClientRect();
      const coords = this.globe.toGlobeCoords(this.lastMouseEvent.clientX - rect.left, this.lastMouseEvent.clientY - rect.top);
      if (coords) {
        const tz = resolveTimezone({ lat: coords.lat, lng: coords.lng }, this.dataset);
        if (tz) { const f = safeFormatTimeInZone(Date.now(), tz); if (f) timeStr = f; }
      }
    }
    this._tooltipEl.innerHTML = timeStr ? `<strong>${name}</strong><br/><span style="font-size:11px;opacity:0.85">${timeStr}</span>` : `<strong>${name}</strong>`;
    if (this.lastMouseEvent) { this._tooltipEl.style.left = `${this.lastMouseEvent.clientX}px`; this._tooltipEl.style.top = `${this.lastMouseEvent.clientY}px`; }
    this._tooltipEl.style.display = "block";
  }

  private _getCentroid(feature: CountryFeature): GeoCoord | null {
    const geom = feature.geometry;
    let ring: number[][] | null = null;
    if (geom.type === "Polygon") ring = (geom.coordinates as number[][][])[0] || null;
    else if (geom.type === "MultiPolygon") ring = (geom.coordinates as number[][][][])[0]?.[0] || null;
    if (!ring || ring.length === 0) return null;
    let sLng = 0, sLat = 0;
    for (const c of ring) { sLng += c[0]!; sLat += c[1]!; }
    return { lng: sLng / ring.length, lat: sLat / ring.length };
  }
}
