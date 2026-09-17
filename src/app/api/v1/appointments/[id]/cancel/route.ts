import { requireCustomer } from "@/lib/auth";
import { appointmentInclude, cancelAppointment, serializeAppointment } from "@/lib/booking";
import { db } from "@/lib/db";
import { ApiError, handler, json } from "@/lib/http";

export const POST = handler(async (req, ctx: RouteContext<"/api/v1/appointments/[id]/cancel">) => {
  const customer = await requireCustomer(req);
  const { id } = await ctx.params;
  const owned = await db.appointment.findFirst({ where: { id, customerId: customer.id }, select: { id: true, startsAt: true } });
  if (!owned) throw new ApiError(404, "Booking not found");
  if (owned.startsAt.getTime() <= Date.now()) throw new ApiError(409, "This booking has already started");
  const result = await cancelAppointment(id);
  const appointment = await db.appointment.findUniqueOrThrow({ where: { id }, include: appointmentInclude });
  return json({ appointment: await serializeAppointment(appointment), ...result });
});
