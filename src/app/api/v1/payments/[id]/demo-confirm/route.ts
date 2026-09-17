import { requireCustomer } from "@/lib/auth";
import { markPaymentSucceeded } from "@/lib/booking";
import { db } from "@/lib/db";
import { ApiError, handler, json } from "@/lib/http";
import { paymentsMode } from "@/lib/payments";

/** Simulates a successful card payment. Only available while Stripe keys are not configured. */
export const POST = handler(async (req, ctx: RouteContext<"/api/v1/payments/[id]/demo-confirm">) => {
  if (paymentsMode !== "demo") throw new ApiError(404, "Not found");
  const customer = await requireCustomer(req);
  const { id } = await ctx.params;
  const payment = await db.payment.findUnique({ where: { id }, include: { appointment: true, giftCard: true } });
  if (!payment || (payment.appointment?.customerId ?? payment.giftCard?.purchaserId) !== customer.id) throw new ApiError(404, "Payment not found");
  await markPaymentSucceeded(payment.id);
  return json({ ok: true });
});
