import { requireCustomer } from "@/lib/auth";
import { appointmentInclude, serializeAppointment } from "@/lib/booking";
import { db } from "@/lib/db";
import { ApiError, handler, json } from "@/lib/http";

export const GET = handler(async (req, ctx: RouteContext<"/api/v1/appointments/[id]">) => {
  const customer = await requireCustomer(req);
  const { id } = await ctx.params;
  const appointment = await db.appointment.findFirst({ where: { id, customerId: customer.id }, include: appointmentInclude });
  if (!appointment) throw new ApiError(404, "Booking not found");
  return json({ appointment: await serializeAppointment(appointment) });
});
