import type { AppointmentStatus } from "@prisma/client";

import { PAYMENT_HOLD_MIN } from "@/lib/availability";
import { formatLocal } from "@/lib/time";

const OFFSET_MS = 4 * 60 * 60 * 1000;

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** UAE week display order: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Value for <input type="datetime-local"> showing an instant in Dubai time. */
export function toLocalInput(d: Date | null | undefined) {
  return d ? new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 16) : "";
}

export const time = (d: Date) => formatLocal(d, { hour: "2-digit", minute: "2-digit" });
export const date = (d: Date) => formatLocal(d, { day: "numeric", month: "short", year: "numeric" });
export const dateTime = (d: Date) => formatLocal(d, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
export const longDate = (d: Date) => formatLocal(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export function statusLabel(status: AppointmentStatus, createdAt: Date) {
  if (status === "PENDING_PAYMENT" && createdAt.getTime() < Date.now() - PAYMENT_HOLD_MIN * 60_000) return { label: "Hold expired", tone: "muted" as const };
  return {
    PENDING_PAYMENT: { label: "Awaiting deposit", tone: "amber" as const },
    CONFIRMED: { label: "Confirmed", tone: "gold" as const },
    COMPLETED: { label: "Completed", tone: "green" as const },
    CANCELLED: { label: "Cancelled", tone: "muted" as const },
    NO_SHOW: { label: "No-show", tone: "red" as const },
  }[status];
}
