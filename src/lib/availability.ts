import type { Prisma } from "@prisma/client";

import { db, getSettings } from "./db";
import { ApiError } from "./http";
import { addDays, hhmmToMin, localDateKey, localToUtc, minToHhmm, weekdayOf } from "./time";

/** Unpaid bookings hold their slot for this long before the slot is released. */
export const PAYMENT_HOLD_MIN = 20;
/** Customers can't book a slot starting sooner than this. */
const LEAD_TIME_MIN = 30;

type OpeningHours = { weekday: number; open: string; close: string }[];

export function blockingAppointmentsWhere(): Prisma.AppointmentWhereInput {
  return {
    OR: [
      { status: { in: ["CONFIRMED", "COMPLETED"] } },
      { status: "PENDING_PAYMENT", createdAt: { gt: new Date(Date.now() - PAYMENT_HOLD_MIN * 60_000) } },
    ],
  };
}

export async function resolveServices(serviceIds: string[]) {
  const unique = [...new Set(serviceIds)];
  const services = await db.service.findMany({ where: { id: { in: unique }, active: true } });
  if (!unique.length || services.length !== unique.length) throw new ApiError(422, "Please choose valid services");
  return services;
}

export type Slot = { time: string; startsAt: string; barberIds: string[] };

/**
 * Free start times on a shop-local date for the given services.
 * A slot is offered when at least one eligible barber is on shift (within branch hours)
 * for the whole duration with no overlapping booking or time off.
 */
export async function findSlots(opts: {
  branchId: string;
  serviceIds: string[];
  date: string;
  barberId?: string | null;
  excludeAppointmentId?: string;
}): Promise<{ durationMin: number; slots: Slot[] }> {
  const settings = await getSettings();
  const services = await resolveServices(opts.serviceIds);
  const durationMin = services.reduce((s, x) => s + x.durationMin, 0);

  const today = localDateKey();
  if (opts.date < today || opts.date > addDays(today, settings.bookingWindowDays)) return { durationMin, slots: [] };

  const branch = await db.branch.findFirst({ where: { id: opts.branchId, active: true } });
  if (!branch) throw new ApiError(404, "Branch not found");

  const weekday = weekdayOf(opts.date);
  const hours = (branch.openingHours as OpeningHours).find((h) => h.weekday === weekday);
  if (!hours) return { durationMin, slots: [] };
  const branchOpen = hhmmToMin(hours.open);
  const branchClose = hhmmToMin(hours.close);

  const barbers = await db.barber.findMany({
    where: {
      branchId: branch.id,
      active: true,
      ...(opts.barberId ? { id: opts.barberId } : {}),
      AND: services.map((s) => ({ services: { some: { serviceId: s.id } } })),
    },
    include: { shifts: { where: { weekday } } },
  });
  if (!barbers.length) return { durationMin, slots: [] };

  const dayStart = localToUtc(opts.date, 0);
  const dayEnd = localToUtc(opts.date, 24 * 60);
  const barberIds = barbers.map((b) => b.id);
  const [appointments, timeOff] = await Promise.all([
    db.appointment.findMany({
      where: {
        barberId: { in: barberIds },
        startsAt: { lt: dayEnd },
        endsAt: { gt: dayStart },
        ...(opts.excludeAppointmentId ? { id: { not: opts.excludeAppointmentId } } : {}),
        ...blockingAppointmentsWhere(),
      },
      select: { barberId: true, startsAt: true, endsAt: true },
    }),
    db.timeOff.findMany({
      where: { barberId: { in: barberIds }, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      select: { barberId: true, startsAt: true, endsAt: true },
    }),
  ]);
  const busy = [...appointments, ...timeOff];
  const earliest = Date.now() + LEAD_TIME_MIN * 60_000;

  const byTime = new Map<number, string[]>();
  for (const barber of barbers) {
    const blocks = busy.filter((b) => b.barberId === barber.id);
    for (const shift of barber.shifts) {
      const from = Math.max(shift.startMin, branchOpen);
      const to = Math.min(shift.endMin, branchClose);
      for (let m = from; m + durationMin <= to; m += settings.slotStepMin) {
        const start = localToUtc(opts.date, m);
        const end = new Date(start.getTime() + durationMin * 60_000);
        if (start.getTime() < earliest) continue;
        if (blocks.some((b) => b.startsAt < end && b.endsAt > start)) continue;
        byTime.set(m, [...(byTime.get(m) ?? []), barber.id]);
      }
    }
  }

  const slots = [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([m, ids]) => ({ time: minToHhmm(m), startsAt: localToUtc(opts.date, m).toISOString(), barberIds: ids }));
  return { durationMin, slots };
}
