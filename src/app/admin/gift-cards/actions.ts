"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { randomCode } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { formatAed } from "@/lib/money";

import { fields, ok, toFormError, type FormState } from "../_lib/form";

const schema = z.object({
  amountAed: z.coerce.number().min(10).max(5000),
  recipientName: z.string().trim().min(1).max(80),
  recipientEmail: z.union([z.email(), z.literal("")]).transform((v) => v || null),
  message: z.string().trim().max(300).transform((v) => v || null),
});

/** Complimentary card: no payment, active immediately. */
export async function issueGiftCard(fd: FormData): Promise<FormState> {
  await requireAdmin();
  try {
    const { amountAed, ...data } = schema.parse(fields(fd));
    const card = await db.giftCard.create({
      data: { ...data, amountFils: Math.round(amountAed * 100), code: `GIFT-${randomCode(4)}-${randomCode(4)}`, active: true },
    });
    revalidatePath("/admin/gift-cards");
    return ok(`Issued ${card.code} for ${formatAed(card.amountFils)}`);
  } catch (err) {
    return toFormError(err);
  }
}
