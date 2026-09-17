"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

import { fail, fields, ok, toFormError, type FormState } from "../_lib/form";

const int = (min: number, max: number) => z.coerce.number().int("Whole numbers only").min(min).max(max);

const schema = z.object({
  depositPercent: int(0, 100),
  cancellationHours: int(0, 168),
  slotStepMin: z.coerce.number().refine((n) => [5, 10, 15, 20, 30, 60].includes(n), "Choose 5, 10, 15, 20, 30 or 60"),
  bookingWindowDays: int(1, 365),
  pointsPerAed: int(0, 100),
  redeemBlockPoints: int(1, 100_000),
  redeemBlockAed: z.coerce.number().min(1).max(10_000),
  goldThreshold: int(1, 1_000_000),
  blackThreshold: int(1, 1_000_000),
  reminderHoursBefore: int(1, 72),
});

export async function saveSettings(fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const { redeemBlockAed, ...data } = schema.parse(fields(fd));
    if (data.blackThreshold <= data.goldThreshold) return fail("Black tier must need more points than Gold");
    await db.settings.upsert({ where: { id: 1 }, update: { ...data, redeemBlockFils: Math.round(redeemBlockAed * 100) }, create: { id: 1, ...data, redeemBlockFils: Math.round(redeemBlockAed * 100) } });
    revalidatePath("/admin", "layout");
    return ok("Settings saved — the app picks them up on next load");
  } catch (err) {
    return toFormError(err);
  }
}
