import { z } from "zod";

import { requireCustomer } from "@/lib/auth";
import { PAYMENT_HOLD_MIN } from "@/lib/availability";
import { db } from "@/lib/db";
import { ApiError, handler, json } from "@/lib/http";
import { startCheckout } from "@/lib/payments";

/** Resume payment for a booking still on hold (e.g. the customer closed the checkout sheet). */
export const POST = handler(async (req, ctx: RouteContext<"/api/v1/appointments/[id]/pay">) => {
  const customer = await requireCustomer(req);
  const { id } = await ctx.params;
  const { returnUrl } = z.object({ returnUrl: z.string().max(500).optional() }).parse(await req.json().catch(() => ({})));
  const appt = await db.appointment.findFirst({ where: { id, customerId: customer.id }, include: { payments: { where: { state: "PENDING" }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!appt) throw new ApiError(404, "Booking not found");
  if (appt.status !== "PENDING_PAYMENT" || appt.createdAt.getTime() < Date.now() - PAYMENT_HOLD_MIN * 60_000 || !appt.payments[0])
    throw new ApiError(409, "This hold has expired. Please book again.", "hold_expired");
  return json({ checkout: await startCheckout(appt.payments[0].id, { description: `Booking deposit ${appt.reference}`, customerEmail: customer.email, appReturnUrl: returnUrl }) });
});
