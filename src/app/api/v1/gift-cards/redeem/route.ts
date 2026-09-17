import { z } from "zod";

import { requireCustomer } from "@/lib/auth";
import { serializeCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { ApiError, body, handler, json } from "@/lib/http";
import { addCredit } from "@/lib/loyalty";

const schema = z.object({ code: z.string().trim().toUpperCase().min(4).max(40) });

export const POST = handler(async (req) => {
  const customer = await requireCustomer(req);
  const { code } = await body(req, schema);
  const result = await db.$transaction(async (tx) => {
    const card = await tx.giftCard.findUnique({ where: { code } });
    if (!card || !card.active) throw new ApiError(404, "That gift card code isn't valid");
    const { count } = await tx.giftCard.updateMany({ where: { id: card.id, redeemedAt: null }, data: { redeemedAt: new Date(), redeemedById: customer.id } });
    if (!count) throw new ApiError(409, "This gift card has already been redeemed");
    await addCredit(tx, customer.id, card.amountFils, `Gift card ${card.code}`, `giftcard:${card.id}`);
    return { amountFils: card.amountFils, customer: await tx.customer.findUniqueOrThrow({ where: { id: customer.id } }) };
  });
  return json({ amountFils: result.amountFils, customer: await serializeCustomer(result.customer) });
});
