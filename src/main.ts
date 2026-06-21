import { GlobeRenderer } from "./components/GlobeRenderer";
import { ClockDisplay } from "./components/ClockDisplay";
import { AppState } from "./state/appState";
import { resolveTimezone, setDataset } from "./utils/timezoneSelector";
import type { TimezoneFeatureCollection } from "./types/index";
import * as topojson from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";

function getElement<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Required DOM element #${id} not found`);
  return el as T;
}

function showError(message: string, onRetry?: () => void): void {
  const existing = document.getElementById("app-error");
  if (existing) existing.remove();
  const errorEl = document.createElement("div");
  errorEl.id = "app-error";
  errorEl.style.cssText = "position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.85);color:#fff;font-family:sans-serif;z-index:10000;gap:16px";
  const msgEl = document.createElement("p");
  msgEl.textContent = message;
  errorEl.appendChild(msgEl);
  if (onRetry) {
    const btn = document.createElement("button");
    btn.textContent = "Retry";
    btn.style.cssText = "padding:8px 24px;font-size:16px;cursor:pointer;border-radius:4px;border:none;background:#3399ff;color:#fff";
    btn.addEventListener("click", () => { errorEl.remove(); onRetry(); });
    errorEl.appendChild(btn);
  }
  document.body.appendChild(errorEl);
}

async function bootstrap(): Promise<void> {
  let dataset: TimezoneFeatureCollection;
  try {
    const response = await fetch("/data/timezones.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    dataset = (await response.json()) as TimezoneFeatureCollection;
  } catch (err) {
    showError(err instanceof Error ? `Failed to load timezone data: ${err.message}` : "Failed to load timezone data.", () => void bootstrap());
    return;
  }
  setDataset(dataset);

  const globeContainer = getElement<HTMLElement>("globe-container");
  const clockContainer = getElement<HTMLElement>("clock-display");
  const globe = new GlobeRenderer(globeContainer);
  const clock = new ClockDisplay(clockContainer);
  const appState = new AppState();
  globe.loadDataset(dataset);

  try {
    const worldRes = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json");
    if (worldRes.ok) {
      const world = (await worldRes.json()) as Topology;
      const countriesGeo = topojson.feature(world, world.objects.countries as GeometryCollection);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      globe.loadCountries(countriesGeo as any);
    }
  } catch { console.warn("Failed to load country shapes"); }

  const restoredTz = appState.selectedTimezone;
  if (restoredTz) { clock.setTimezone(restoredTz); globe.highlightTimezone(restoredTz); }

  globe.onPointerClick = (coord) => {
    if (!coord) return;
    const tz = resolveTimezone(coord, dataset);
    if (!tz) return;
    appState.setSelectedTimezone(tz);
  };

  appState.subscribe("selectedTimezone", (tz) => {
    clock.setTimezone(tz);
    globe.highlightTimezone(tz);
  });
}

void bootstrap();
