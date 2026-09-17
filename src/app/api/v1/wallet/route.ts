import { requireCustomer } from "@/lib/auth";
import { serializeCustomer } from "@/lib/customer";
import { db } from "@/lib/db";
import { handler, json } from "@/lib/http";

export const GET = handler(async (req) => {
  const customer = await requireCustomer(req);
  const [points, credit, giftCards] = await Promise.all([
    db.pointsEntry.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.creditEntry.findMany({ where: { customerId: customer.id }, orderBy: { createdAt: "desc" }, take: 30 }),
    db.giftCard.findMany({ where: { purchaserId: customer.id, active: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const activity = [
    ...points.map((p) => ({ id: p.id, kind: "points" as const, amount: p.points, reason: p.reason, createdAt: p.createdAt })),
    ...credit.map((c) => ({ id: c.id, kind: "credit" as const, amount: c.amountFils, reason: c.reason, createdAt: c.createdAt })),
  ].sort((a, b) => +b.createdAt - +a.createdAt);
  return json({
    customer: await serializeCustomer(customer),
    activity,
    giftCardsSent: giftCards.map((g) => ({ id: g.id, code: g.code, amountFils: g.amountFils, recipientName: g.recipientName, redeemed: !!g.redeemedAt, createdAt: g.createdAt })),
  });
});
