import type { FormattedTime } from "../types/index";

function pad(value: number, length: number): string {
  return String(value).padStart(length, "0");
}

export function formatTimeInZone(epochMs: number, tzId: string): FormattedTime {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: tzId,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(epochMs));
  const lookup: Record<string, string> = {};
  for (const part of parts) {
    lookup[part.type] = part.value;
  }

  const year = pad(parseInt(lookup["year"] ?? "0", 10), 4);
  const month = pad(parseInt(lookup["month"] ?? "0", 10), 2);
  const day = pad(parseInt(lookup["day"] ?? "0", 10), 2);
  const rawHour = parseInt(lookup["hour"] ?? "0", 10);
  const hour = pad(rawHour === 24 ? 0 : rawHour, 2);
  const minute = pad(parseInt(lookup["minute"] ?? "0", 10), 2);
  const second = pad(parseInt(lookup["second"] ?? "0", 10), 2);

  return `${year}-${month}-${day} ${hour}:${minute}:${second} ${tzId}`;
}

export function safeFormatTimeInZone(epochMs: number, tzId: string): FormattedTime | null {
  try {
    return formatTimeInZone(epochMs, tzId);
  } catch (error) {
    if (error instanceof RangeError) return null;
    throw error;
  }
}
