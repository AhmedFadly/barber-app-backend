import { z } from "zod";

import { requireCustomer } from "@/lib/auth";
import { serializeCustomer } from "@/lib/customer";
import { db, getSettings } from "@/lib/db";
import { ApiError, body, handler, json } from "@/lib/http";
import { addCredit } from "@/lib/loyalty";

const schema = z.object({ blocks: z.number().int().min(1).max(100) });

/** Converts points into wallet credit in fixed blocks (e.g. 500 pts → AED 50). */
export const POST = handler(async (req) => {
  const customer = await requireCustomer(req);
  const { blocks } = await body(req, schema);
  const settings = await getSettings();
  const points = blocks * settings.redeemBlockPoints;
  const fils = blocks * settings.redeemBlockFils;
  const updated = await db.$transaction(async (tx) => {
    const { count } = await tx.customer.updateMany({ where: { id: customer.id, pointsBalance: { gte: points } }, data: { pointsBalance: { decrement: points } } });
    if (!count) throw new ApiError(409, "You don't have enough points for that");
    const key = crypto.randomUUID();
    await tx.pointsEntry.create({ data: { customerId: customer.id, points: -points, reason: "Converted to wallet credit", sourceKey: `redeem:${key}` } });
    await addCredit(tx, customer.id, fils, `${points} points redeemed`, `redeem:${key}`);
    return tx.customer.findUniqueOrThrow({ where: { id: customer.id } });
  });
  return json({ customer: await serializeCustomer(updated) });
});
