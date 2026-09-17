import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { localDateKey, weekdayOf } from "@/lib/time";

import { Badge, ButtonLink, PageHeader } from "../_components/ui";

export const metadata: Metadata = { title: "Branches" };

type OpeningHours = { weekday: number; open: string; close: string }[];

export default async function BranchesPage() {
  const weekday = weekdayOf(localDateKey());
  const branches = await db.branch.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { barbers: { where: { active: true } }, appointments: { where: { status: "CONFIRMED", startsAt: { gte: new Date() } } } } } },
  });

  return (
    <>
      <PageHeader eyebrow={`${branches.length} houses`} title="Branches">
        <ButtonLink href="/admin/branches/new">New branch</ButtonLink>
      </PageHeader>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 18 }}>
        {branches.map((b) => {
          const today = (b.openingHours as OpeningHours).find((h) => h.weekday === weekday);
          return (
            <Link key={b.id} href={`/admin/branches/${b.id}`} className="card" style={{ display: "block", opacity: b.active ? 1 : 0.6 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imageUrl} alt="" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
              <div className="card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <h2 className="card-title">{b.name}</h2>
                  {b.active ? <Badge tone="green">Open</Badge> : <Badge>Inactive</Badge>}
                </div>
                <p className="small muted">{b.address}</p>
                <p className="small">
                  Today: {today ? `${today.open}–${today.close}` : <span className="muted">Closed</span>}
                  <span className="muted"> · {b._count.barbers} barbers · {b._count.appointments} upcoming</span>
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
