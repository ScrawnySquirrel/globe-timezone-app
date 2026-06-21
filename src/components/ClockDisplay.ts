import { safeFormatTimeInZone } from "../utils/clockFormatter";
import type { IANATimezone } from "../types/index";

const PLACEHOLDER_TEXT = "Select a timezone";
const TICK_INTERVAL_MS = 1000;

export class ClockDisplay {
  private readonly container: HTMLElement;
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.container.textContent = PLACEHOLDER_TEXT;
  }

  setTimezone(tzId: IANATimezone | null): void {
    this._clearInterval();
    if (tzId === null) { this.container.textContent = PLACEHOLDER_TEXT; return; }
    if (!this._isValid(tzId)) { this.container.textContent = `Timezone error: "${tzId}" is not recognized`; return; }
    this._tick(tzId);
    this.intervalId = setInterval(() => this._tick(tzId), TICK_INTERVAL_MS);
  }

  dispose(): void { this._clearInterval(); this.container.textContent = ""; }

  private _tick(tzId: IANATimezone): void {
    const f = safeFormatTimeInZone(Date.now(), tzId);
    if (!f) { this._clearInterval(); this.container.textContent = `Timezone error: "${tzId}" is not recognized`; return; }
    this.container.textContent = f;
  }

  private _clearInterval(): void { if (this.intervalId !== null) { clearInterval(this.intervalId); this.intervalId = null; } }

  private _isValid(tzId: string): boolean { try { Intl.DateTimeFormat(undefined, { timeZone: tzId }); return true; } catch { return false; } }
}
