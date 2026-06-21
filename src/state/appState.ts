import type { GeoCoord, IANATimezone } from "../types/index";

export interface State {
  selectedTimezone: IANATimezone | null;
  hoveredTimezone: IANATimezone | null;
  cursorPosition: GeoCoord | null;
}

type Listener<K extends keyof State> = (value: State[K]) => void;

const STORAGE_KEY = "globe-tz-selected";

export class AppState {
  private state: State;
  private listeners: { [K in keyof State]?: Set<Listener<K>> } = {};

  constructor() {
    let persisted: IANATimezone | null = null;
    try { persisted = sessionStorage.getItem(STORAGE_KEY) as IANATimezone | null; } catch {}
    this.state = { selectedTimezone: persisted, hoveredTimezone: null, cursorPosition: null };
  }

  get selectedTimezone() { return this.state.selectedTimezone; }
  get hoveredTimezone() { return this.state.hoveredTimezone; }
  get cursorPosition() { return this.state.cursorPosition; }

  setSelectedTimezone(tz: IANATimezone | null): void {
    if (this.state.selectedTimezone === tz) return;
    this.state.selectedTimezone = tz;
    try { if (tz === null) sessionStorage.removeItem(STORAGE_KEY); else sessionStorage.setItem(STORAGE_KEY, tz); } catch {}
    this._notify("selectedTimezone", tz);
  }

  setHoveredTimezone(tz: IANATimezone | null): void {
    if (this.state.hoveredTimezone === tz) return;
    this.state.hoveredTimezone = tz;
    this._notify("hoveredTimezone", tz);
  }

  setCursorPosition(coord: GeoCoord | null): void {
    this.state.cursorPosition = coord;
    this._notify("cursorPosition", coord);
  }

  subscribe<K extends keyof State>(key: K, listener: Listener<K>): () => void {
    if (!this.listeners[key]) (this.listeners as Record<string, Set<unknown>>)[key] = new Set();
    (this.listeners[key] as Set<Listener<K>>).add(listener);
    return () => { (this.listeners[key] as Set<Listener<K>>).delete(listener); };
  }

  private _notify<K extends keyof State>(key: K, value: State[K]): void {
    const set = this.listeners[key] as Set<Listener<K>> | undefined;
    if (!set) return;
    for (const listener of set) listener(value);
  }
}
