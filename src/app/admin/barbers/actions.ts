"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

import { WEEKDAYS } from "../_lib/format";
import { checked, fail, fields, ok, toFormError, type FormState } from "../_lib/form";
import { fromLocalInput, parseWeek } from "../_lib/hours";

const barberSchema = z.object({
  name: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(60),
  bio: z.string().trim().max(600).default(""),
  photoUrl: z.url("Enter a full photo URL (https://…)"),
  rating: z.coerce.number().min(0).max(5),
  branchId: z.string().min(1, "Choose a branch"),
});

function barberInput(fd: FormData) {
  const data = { ...barberSchema.parse(fields(fd)), active: checked(fd, "active") };
  const serviceIds = [...new Set(fd.getAll("service").map(String))];
  const shifts = parseWeek(fd, "shift", WEEKDAYS).map(({ weekday, startMin, endMin }) => ({ weekday, startMin, endMin }));
  return { data, serviceIds, shifts };
}

export async function createBarber(fd: FormData): Promise<FormState> {
  await requireAdmin();
  let id: string;
  try {
    const { data, serviceIds, shifts } = barberInput(fd);
    const barber = await db.barber.create({
      data: { ...data, services: { create: serviceIds.map((serviceId) => ({ serviceId })) }, shifts: { create: shifts } },
    });
    id = barber.id;
  } catch (err) {
    return toFormError(err);
  }
  revalidatePath("/admin/barbers");
  redirect(`/admin/barbers/${id}`);
}

export async function updateBarber(id: string, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const { data, serviceIds, shifts } = barberInput(fd);
    await db.$transaction([
      db.barber.update({ where: { id }, data }),
      db.barberService.deleteMany({ where: { barberId: id } }),
      db.barberService.createMany({ data: serviceIds.map((serviceId) => ({ barberId: id, serviceId })) }),
      db.shift.deleteMany({ where: { barberId: id } }),
      db.shift.createMany({ data: shifts.map((s) => ({ ...s, barberId: id })) }),
    ]);
    revalidatePath("/admin/barbers", "layout");
    return ok("Barber saved");
  } catch (err) {
    return toFormError(err);
  }
}

export async function addTimeOff(barberId: string, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const startsAt = fromLocalInput(fd.get("startsAt"));
  const endsAt = fromLocalInput(fd.get("endsAt"));
  const reason = String(fd.get("reason") ?? "").trim().slice(0, 120) || null;
  if (!startsAt || !endsAt) return fail("Enter a start and end date/time");
  if (endsAt <= startsAt) return fail("End must be after start");
  await db.timeOff.create({ data: { barberId, startsAt, endsAt, reason } });
  // Existing bookings aren't moved automatically — tell the admin so they can reach out.
  const clashes = await db.appointment.count({
    where: { barberId, status: { in: ["CONFIRMED", "PENDING_PAYMENT"] }, startsAt: { lt: endsAt }, endsAt: { gt: startsAt } },
  });
  revalidatePath(`/admin/barbers/${barberId}`);
  return ok(clashes ? `Time off added — ⚠ ${clashes} existing booking${clashes === 1 ? " overlaps" : "s overlap"} it, reschedule or cancel them` : "Time off added");
}

export async function removeTimeOff(id: string): Promise<FormState> {
  await requireAdmin();
  const row = await db.timeOff.delete({ where: { id } }).catch(() => null);
  if (row) revalidatePath(`/admin/barbers/${row.barberId}`);
  return row ? ok("Removed") : fail("Already removed");
}
