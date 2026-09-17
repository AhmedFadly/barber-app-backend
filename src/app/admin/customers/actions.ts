"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { db, getSettings } from "@/lib/db";
import { ApiError } from "@/lib/http";
import { addCredit, tierFor } from "@/lib/loyalty";
import { formatAed } from "@/lib/money";

import { fields, ok, toFormError, type FormState } from "../_lib/form";

const creditSchema = z.object({
  amountAed: z.coerce.number().refine((n) => n !== 0, "Enter a non-zero amount").refine((n) => Math.abs(n) <= 10_000, "Too large"),
  reason: z.string().trim().min(3, "Add a short reason").max(120),
});

export async function adjustCredit(customerId: string, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const { amountAed, reason } = creditSchema.parse(fields(fd));
    const fils = Math.round(amountAed * 100);
    await db.$transaction(async (tx) => {
      const c = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
      if (c.creditFils + fils < 0) throw new ApiError(422, `Wallet only has ${formatAed(c.creditFils)}`);
      await addCredit(tx, customerId, fils, `Admin: ${reason}`, `admin:${crypto.randomUUID()}`);
    });
    revalidatePath(`/admin/customers/${customerId}`);
    return ok(`${fils > 0 ? "Added" : "Removed"} ${formatAed(Math.abs(fils))}`);
  } catch (err) {
    return toFormError(err);
  }
}

const pointsSchema = z.object({
  points: z.coerce.number().int("Whole points only").refine((n) => n !== 0, "Enter a non-zero amount").refine((n) => Math.abs(n) <= 100_000, "Too large"),
  reason: z.string().trim().min(3, "Add a short reason").max(120),
});

/** Positive adjustments also count towards lifetime points (and so tier); deductions only reduce the balance. */
export async function adjustPoints(customerId: string, fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const { points, reason } = pointsSchema.parse(fields(fd));
    const settings = await getSettings();
    await db.$transaction(async (tx) => {
      const c = await tx.customer.findUniqueOrThrow({ where: { id: customerId } });
      if (c.pointsBalance + points < 0) throw new ApiError(422, `Customer only has ${c.pointsBalance} points`);
      const lifetime = c.lifetimePoints + Math.max(0, points);
      await tx.pointsEntry.create({ data: { customerId, points, reason: `Admin: ${reason}`, sourceKey: `admin:${crypto.randomUUID()}` } });
      await tx.customer.update({
        where: { id: customerId },
        data: { pointsBalance: { increment: points }, lifetimePoints: lifetime, tier: tierFor(lifetime, settings) },
      });
    });
    revalidatePath(`/admin/customers/${customerId}`);
    return ok(`${points > 0 ? "Added" : "Removed"} ${Math.abs(points)} points`);
  } catch (err) {
    return toFormError(err);
  }
}
