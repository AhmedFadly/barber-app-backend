import { z } from "zod";

import { requireCustomer } from "@/lib/auth";
import { appointmentInclude, rescheduleAppointment, serializeAppointment } from "@/lib/booking";
import { db } from "@/lib/db";
import { body, handler, json } from "@/lib/http";

const schema = z.object({ startsAt: z.iso.datetime().transform((s) => new Date(s)), barberId: z.string().min(1).nullable() });

export const POST = handler(async (req, ctx: RouteContext<"/api/v1/appointments/[id]/reschedule">) => {
  const customer = await requireCustomer(req);
  const { id } = await ctx.params;
  const { startsAt, barberId } = await body(req, schema);
  await rescheduleAppointment(id, customer.id, startsAt, barberId);
  const appointment = await db.appointment.findUniqueOrThrow({ where: { id }, include: appointmentInclude });
  return json({ appointment: await serializeAppointment(appointment) });
});
