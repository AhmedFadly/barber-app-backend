import { PAYMENT_HOLD_MIN } from "@/lib/availability";
import { expireStaleHolds } from "@/lib/booking";
import { db, getSettings } from "@/lib/db";
import { sendPush } from "@/lib/push";
import { formatLocal } from "@/lib/time";

/** Run every ~10 minutes: releases timed-out holds and pushes upcoming-appointment reminders. */
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("Unauthorized", { status: 401 });
  const settings = await getSettings();
  const expired = await expireStaleHolds(PAYMENT_HOLD_MIN);

  const due = await db.appointment.findMany({
    where: { status: "CONFIRMED", reminderSentAt: null, startsAt: { gt: new Date(), lte: new Date(Date.now() + settings.reminderHoursBefore * 3_600_000) } },
    include: { branch: true, barber: true },
  });
  for (const a of due) {
    await sendPush(
      { title: "Your appointment is coming up", body: `${a.barber.name} is expecting you at ${formatLocal(a.startsAt, { hour: "2-digit", minute: "2-digit" })}, ${a.branch.name}.`, data: { appointmentId: a.id } },
      [a.customerId],
    );
    await db.appointment.update({ where: { id: a.id }, data: { reminderSentAt: new Date() } });
  }
  return Response.json({ expiredHolds: expired, remindersSent: due.length });
}
