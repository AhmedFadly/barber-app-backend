// The shop runs on Asia/Dubai: UTC+4 all year, no DST, so a fixed offset is exact.
export const SHOP_TZ = "Asia/Dubai";
const OFFSET_MS = 4 * 60 * 60 * 1000;

/** "YYYY-MM-DD" in shop-local time for an instant. */
export function localDateKey(d: Date = new Date()): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** Minutes since shop-local midnight for an instant. */
export function localMinutes(d: Date): number {
  const l = new Date(d.getTime() + OFFSET_MS);
  return l.getUTCHours() * 60 + l.getUTCMinutes();
}

export function parseDateKey(key: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  return { y: +match[1], m: +match[2], d: +match[3] };
}

/** UTC instant for a shop-local date + minutes after midnight. */
export function localToUtc(dateKey: string, minutes: number): Date {
  const p = parseDateKey(dateKey);
  if (!p) throw new Error(`Bad date ${dateKey}`);
  return new Date(Date.UTC(p.y, p.m - 1, p.d, 0, minutes) - OFFSET_MS);
}

/** 0 = Sunday … 6 = Saturday, for a shop-local date. */
export function weekdayOf(dateKey: string): number {
  const p = parseDateKey(dateKey)!;
  return new Date(Date.UTC(p.y, p.m - 1, p.d)).getUTCDay();
}

export function addDays(dateKey: string, days: number): string {
  const p = parseDateKey(dateKey)!;
  return new Date(Date.UTC(p.y, p.m - 1, p.d + days)).toISOString().slice(0, 10);
}

export function hhmmToMin(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + m;
}

export function minToHhmm(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function formatLocal(d: Date, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: SHOP_TZ, ...opts }).format(d);
}
