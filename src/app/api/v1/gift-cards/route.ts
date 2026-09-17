import { z } from "zod";

import { randomCode, requireCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, handler, json } from "@/lib/http";
import { startCheckout } from "@/lib/payments";

const schema = z.object({
  amountFils: z.number().int().min(10_000).max(500_000),
  recipientName: z.string().trim().min(1).max(80),
  recipientEmail: z.email().optional().or(z.literal("").transform(() => undefined)),
  message: z.string().trim().max(300).optional(),
  returnUrl: z.string().max(500).optional(),
});

export const POST = handler(async (req) => {
  const customer = await requireCustomer(req);
  const { returnUrl, ...input } = await body(req, schema);
  const giftCard = await db.giftCard.create({ data: { ...input, code: `GIFT-${randomCode(4)}-${randomCode(4)}`, purchaserId: customer.id } });
  const payment = await db.payment.create({
    data: { purpose: "GIFT_CARD", provider: process.env.STRIPE_SECRET_KEY ? "stripe" : "demo", amountFils: input.amountFils, giftCardId: giftCard.id },
  });
  const checkout = await startCheckout(payment.id, { description: `REGENT gift card for ${input.recipientName}`, customerEmail: customer.email, appReturnUrl: returnUrl });
  return json({ giftCardId: giftCard.id, checkout }, 201);
});
