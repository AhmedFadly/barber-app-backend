import { z } from "zod";

import { requireCustomer } from "@/lib/auth";
import { appointmentInclude, createAppointment, serializeAppointment } from "@/lib/booking";
import { db } from "@/lib/db";
import { body, handler, json } from "@/lib/http";
import { startCheckout } from "@/lib/payments";

export const GET = handler(async (req) => {
  const customer = await requireCustomer(req);
  const appointments = await db.appointment.findMany({
    where: { customerId: customer.id, NOT: { status: "CANCELLED", paymentStatus: "UNPAID", creditUsedFils: 0 } },
    orderBy: { startsAt: "desc" },
    take: 100,
    include: appointmentInclude,
  });
  return json({ appointments: await Promise.all(appointments.map(serializeAppointment)) });
});

const schema = z.object({
  branchId: z.string().min(1),
  serviceIds: z.array(z.string().min(1)).min(1).max(6),
  barberId: z.string().min(1).nullable(),
  startsAt: z.iso.datetime().transform((s) => new Date(s)),
  notes: z.string().trim().max(500).optional(),
  useCredit: z.boolean().default(false),
  returnUrl: z.string().max(500).optional(),
});

export const POST = handler(async (req) => {
  const customer = await requireCustomer(req);
  const { returnUrl, ...input } = await body(req, schema);
  const created = await createAppointment({ ...input, customerId: customer.id });
  const appointment = await db.appointment.findUniqueOrThrow({ where: { id: created.appointmentId }, include: appointmentInclude });
  const checkout = created.payment
    ? await startCheckout(created.payment.id, { description: `Booking deposit ${created.reference}`, customerEmail: customer.email, appReturnUrl: returnUrl })
    : null;
  return json({ appointment: await serializeAppointment(appointment), checkout }, 201);
});
