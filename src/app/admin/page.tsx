import type { Metadata } from "next";

import { db } from "@/lib/db";
import { formatAed } from "@/lib/money";
import { addDays, localDateKey, localToUtc, weekdayOf } from "@/lib/time";

import { AppointmentTable } from "./_components/appointment-table";
import { ButtonLink, Card, Kpi, PageHeader } from "./_components/ui";
import { adminAppointmentInclude } from "./_lib/appointments";
import { longDate } from "./_lib/format";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const today = localDateKey();
  const dayStart = localToUtc(today, 0);
  const dayEnd = localToUtc(addDays(today, 1), 0);
  // Monday-start week, matching the UAE working week.
  const weekStartKey = addDays(today, -((weekdayOf(today) + 6) % 7));
  const weekStart = localToUtc(weekStartKey, 0);
  const weekEnd = localToUtc(addDays(weekStartKey, 7), 0);
  const booked = { status: { in: ["CONFIRMED", "COMPLETED"] as ("CONFIRMED" | "COMPLETED")[] } };

  const [appointments, revenueToday, revenueWeek, newCustomers, deposits, upcomingWeek] = await Promise.all([
    db.appointment.findMany({
      where: { startsAt: { gte: dayStart, lt: dayEnd }, status: { not: "CANCELLED" } },
      orderBy: [{ branch: { sortOrder: "asc" } }, { startsAt: "asc" }],
      include: adminAppointmentInclude,
    }),
    db.appointment.aggregate({ where: { startsAt: { gte: dayStart, lt: dayEnd }, ...booked }, _sum: { subtotalFils: true } }),
    db.appointment.aggregate({ where: { startsAt: { gte: weekStart, lt: weekEnd }, ...booked }, _sum: { subtotalFils: true }, _count: true }),
    db.customer.count({ where: { createdAt: { gte: weekStart } } }),
    db.payment.aggregate({ where: { purpose: "DEPOSIT", state: "SUCCEEDED", createdAt: { gte: weekStart, lt: weekEnd } }, _sum: { amountFils: true }, _count: true }),
    db.appointment.count({ where: { startsAt: { gte: new Date(), lt: weekEnd }, status: "CONFIRMED" } }),
  ]);

  const live = appointments.filter((a) => a.status === "CONFIRMED" || a.status === "COMPLETED" || a.status === "NO_SHOW");
  const completed = appointments.filter((a) => a.status === "COMPLETED").length;
  const pending = appointments.filter((a) => a.status === "PENDING_PAYMENT").length;

  return (
    <>
      <PageHeader eyebrow={longDate(new Date())} title="Today">
        <ButtonLink href="/admin/appointments" variant="ghost">
          All appointments
        </ButtonLink>
      </PageHeader>

      <div className="kpis">
        <Kpi label="Bookings today" value={live.length} hint={`${completed} completed${pending ? ` · ${pending} awaiting deposit` : ""}`} />
        <Kpi label="Revenue today" value={formatAed(revenueToday._sum.subtotalFils ?? 0)} hint="Confirmed + completed" />
        <Kpi label="Revenue this week" value={formatAed(revenueWeek._sum.subtotalFils ?? 0)} hint={`${revenueWeek._count} bookings · ${upcomingWeek} still to come`} />
        <Kpi label="Deposits this week" value={formatAed(deposits._sum.amountFils ?? 0)} hint={`${deposits._count} card payment${deposits._count === 1 ? "" : "s"}`} />
        <Kpi label="New customers" value={newCustomers} hint="Since Monday" />
      </div>

      <Card title="Schedule" subtitle="Grouped by branch, in Dubai time" flush>
        <AppointmentTable appointments={appointments} groupByBranch emptyText="No bookings today yet." />
      </Card>
    </>
  );
}
