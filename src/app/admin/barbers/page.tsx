import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { localDateKey, localToUtc, minToHhmm, weekdayOf } from "@/lib/time";

import { Badge, ButtonLink, Card, Empty, PageHeader, TableWrap, Thumb } from "../_components/ui";

export const metadata: Metadata = { title: "Barbers" };

export default async function BarbersPage() {
  const today = localDateKey();
  const weekday = weekdayOf(today);
  const barbers = await db.barber.findMany({
    orderBy: [{ branch: { sortOrder: "asc" } }, { name: "asc" }],
    include: {
      branch: { select: { name: true } },
      shifts: true,
      _count: { select: { services: true, appointments: { where: { status: "CONFIRMED", startsAt: { gte: new Date() } } } } },
      timeOff: { where: { startsAt: { lt: localToUtc(today, 24 * 60) }, endsAt: { gt: localToUtc(today, 0) } }, select: { id: true } },
    },
  });

  return (
    <>
      <PageHeader eyebrow={`${barbers.filter((b) => b.active).length} active`} title="Barbers">
        <ButtonLink href="/admin/barbers/new">New barber</ButtonLink>
      </PageHeader>
      <Card flush>
        {barbers.length ? (
          <TableWrap>
            <thead>
              <tr>
                <th>Barber</th>
                <th>Branch</th>
                <th>Today</th>
                <th className="num">Days / week</th>
                <th className="num">Services</th>
                <th className="num">Upcoming</th>
                <th className="num">Rating</th>
                <th>Status</th>
                <th className="actions" />
              </tr>
            </thead>
            <tbody>
              {barbers.map((b) => {
                const shift = b.shifts.find((s) => s.weekday === weekday);
                return (
                  <tr key={b.id} className={b.active ? undefined : "dim"}>
                    <td>
                      <div className="person">
                        <Thumb src={b.photoUrl} alt="" size={40} round />
                        <div>
                          <Link href={`/admin/barbers/${b.id}`} className="link cell-title">
                            {b.name}
                          </Link>
                          <div className="cell-sub">{b.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="nowrap">{b.branch.name}</td>
                    <td className="nowrap">{b.timeOff.length ? <Badge tone="amber">Time off</Badge> : shift ? `${minToHhmm(shift.startMin)}–${minToHhmm(shift.endMin)}` : <span className="muted">Day off</span>}</td>
                    <td className="num">{new Set(b.shifts.map((s) => s.weekday)).size}</td>
                    <td className="num">{b._count.services}</td>
                    <td className="num">{b._count.appointments}</td>
                    <td className="num">★ {b.rating.toFixed(1)}</td>
                    <td>{b.active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>}</td>
                    <td className="actions">
                      <ButtonLink href={`/admin/barbers/${b.id}`} variant="ghost">
                        Edit
                      </ButtonLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        ) : (
          <Empty>No barbers yet.</Empty>
        )}
      </Card>
    </>
  );
}
