"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin-auth";
import { cancelAppointment, completeAppointment } from "@/lib/booking";
import { db } from "@/lib/db";
import { formatAed } from "@/lib/money";

import { fail, ok, toFormError, type FormState } from "./form";

export async function completeAction(id: string): Promise<FormState> {
  await requireAdmin();
  try {
    const appt = await db.appointment.findUnique({ where: { id }, select: { status: true } });
    if (appt?.status !== "CONFIRMED") return fail("Only confirmed bookings can be completed");
    const points = await completeAppointment(id);
    revalidatePath("/admin", "layout");
    return ok(points ? `Completed · +${points} pts` : "Completed");
  } catch (err) {
    return toFormError(err);
  }
}

export async function noShowAction(id: string): Promise<FormState> {
  await requireAdmin();
  const { count } = await db.appointment.updateMany({ where: { id, status: "CONFIRMED" }, data: { status: "NO_SHOW" } });
  if (!count) return fail("Only confirmed bookings can be marked no-show");
  revalidatePath("/admin", "layout");
  return ok("Marked no-show");
}

export async function cancelAction(id: string): Promise<FormState> {
  await requireAdmin();
  try {
    const { refundedFils } = await cancelAppointment(id, { byShop: true });
    revalidatePath("/admin", "layout");
    return ok(refundedFils ? `Cancelled · ${formatAed(refundedFils)} to wallet` : "Cancelled");
  } catch (err) {
    return toFormError(err);
  }
}
