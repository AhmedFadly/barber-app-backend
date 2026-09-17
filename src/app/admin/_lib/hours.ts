import { z } from "zod";

import { hhmmToMin, localToUtc } from "@/lib/time";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

/** Reads the 7-row weekly hours editor (`<prefix>_<weekday>_on|start|end`). */
export function parseWeek(fd: FormData, prefix: string, dayNames: string[]) {
  const days: { weekday: number; startMin: number; endMin: number; start: string; end: string }[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    if (fd.get(`${prefix}_${weekday}_on`) !== "on") continue;
    const start = hhmm.parse(fd.get(`${prefix}_${weekday}_start`));
    const end = hhmm.parse(fd.get(`${prefix}_${weekday}_end`));
    const startMin = hhmmToMin(start);
    const endMin = hhmmToMin(end);
    if (endMin <= startMin) throw new z.ZodError([{ code: "custom", path: [dayNames[weekday]], message: "End time must be after start time", input: end }]);
    days.push({ weekday, startMin, endMin, start, end });
  }
  return days;
}

/** "2026-09-20T14:30" entered in Dubai time → UTC Date. */
export function fromLocalInput(value: FormDataEntryValue | null) {
  const m = typeof value === "string" ? /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})$/.exec(value) : null;
  if (!m) return null;
  return localToUtc(m[1], +m[2] * 60 + +m[3]);
}
