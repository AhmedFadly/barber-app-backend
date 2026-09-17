import type { AppointmentStatus, Prisma } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatAed } from "@/lib/money";
import { addDays, localDateKey, localToUtc, parseDateKey } from "@/lib/time";

import { AppointmentTable } from "../_components/appointment-table";
import { Card, PageHeader } from "../_components/ui";
import { adminAppointmentInclude } from "../_lib/appointments";
import { longDate } from "../_lib/format";

export const metadata: Metadata = { title: "Appointments" };

const STATUSES: { value: AppointmentStatus; label: string }[] = [
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "PENDING_PAYMENT", label: "Awaiting deposit" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NO_SHOW", label: "No-show" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function AppointmentsPage(props: PageProps<"/admin/appointments">) {
  const sp = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const date = parseDateKey(one(sp.date)) ? one(sp.date) : localDateKey();
  const branchId = one(sp.branch);
  const status = STATUSES.some((s) => s.value === one(sp.status)) ? (one(sp.status) as AppointmentStatus) : "";

  const where: Prisma.AppointmentWhereInput = {
    startsAt: { gte: localToUtc(date, 0), lt: localToUtc(addDays(date, 1), 0) },
    ...(branchId ? { branchId } : {}),
    ...(status ? { status } : {}),
  };
  const [branches, appointments] = await Promise.all([
    db.branch.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.appointment.findMany({ where, orderBy: [{ startsAt: "asc" }], include: adminAppointmentInclude }),
  ]);

  const href = (d: string) => {
    const q = new URLSearchParams({ date: d, ...(branchId ? { branch: branchId } : {}), ...(status ? { status } : {}) });
    return `/admin/appointments?${q}`;
  };
  const total = appointments.filter((a) => a.status === "CONFIRMED" || a.status === "COMPLETED").reduce((s, a) => s + a.subtotalFils, 0);

  return (
    <>
      <PageHeader eyebrow={longDate(localToUtc(date, 12 * 60))} title="Appointments">
        <div className="day-nav">
          <Link href={href(addDays(date, -1))} className="btn btn-ghost" aria-label="Previous day">
            ←
          </Link>
          <Link href={href(localDateKey())} className="btn btn-ghost">
            Today
          </Link>
          <Link href={href(addDays(date, 1))} className="btn btn-ghost" aria-label="Next day">
            →
          </Link>
        </div>
      </PageHeader>

      <form className="filters" action="/admin/appointments">
        <label>
          <span className="field-label">Date</span>
          <input type="date" name="date" defaultValue={date} />
        </label>
        <label>
          <span className="field-label">Branch</span>
          <select name="branch" defaultValue={branchId}>
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">Status</span>
          <select name="status" defaultValue={status}>
            <option value="">Any status</option>
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">
          Apply
        </button>
      </form>

      <Card title={`${appointments.length} appointment${appointments.length === 1 ? "" : "s"}`} subtitle={`${formatAed(total)} confirmed + completed`} flush>
        <AppointmentTable appointments={appointments} emptyText="Nothing matches these filters." />
      </Card>
    </>
  );
}
