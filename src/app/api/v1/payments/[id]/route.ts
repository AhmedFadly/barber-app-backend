import { requireCustomer } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, handler, json } from "@/lib/http";
import { markPaymentSucceeded } from "@/lib/booking";
import { stripe, verifyStripeSession } from "@/lib/payments";

/** Payment status, polled by the app after the checkout browser closes. */
export const GET = handler(async (req, ctx: RouteContext<"/api/v1/payments/[id]">) => {
  const customer = await requireCustomer(req);
  const { id } = await ctx.params;
  let payment = await db.payment.findUnique({ where: { id }, include: { appointment: true, giftCard: true } });
  const ownerId = payment?.appointment?.customerId ?? payment?.giftCard?.purchaserId;
  if (!payment || ownerId !== customer.id) throw new ApiError(404, "Payment not found");
  // Webhooks can lag; check Stripe directly so the app sees success immediately.
  if (payment.state === "PENDING" && stripe && payment.providerRef) {
    const { paid } = await verifyStripeSession(payment.providerRef);
    if (paid) {
      await markPaymentSucceeded(payment.id);
      payment = await db.payment.findUniqueOrThrow({ where: { id }, include: { appointment: true, giftCard: true } });
    }
  }
  return json({
    state: payment.state,
    appointmentId: payment.appointmentId,
    giftCard: payment.giftCard?.active ? { code: payment.giftCard.code, amountFils: payment.giftCard.amountFils, recipientName: payment.giftCard.recipientName } : null,
  });
});
