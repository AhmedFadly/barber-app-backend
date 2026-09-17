import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatAed } from "@/lib/money";

import { Card, Empty, PageHeader, TableWrap, TierBadge } from "../_components/ui";
import { date } from "../_lib/format";

export const metadata: Metadata = { title: "Customers" };

const PAGE_SIZE = 50;

export default async function CustomersPage(props: PageProps<"/admin/customers">) {
  const sp = await props.searchParams;
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";

  const terms = q.split(/\s+/).filter(Boolean);
  const where: Prisma.CustomerWhereInput = {
    email: { not: { endsWith: "@deleted.invalid" } },
    // Every word must match some field, so "ahmed demo" finds first + last name.
    AND: terms.map((t) => ({
      OR: [
        { firstName: { contains: t, mode: "insensitive" } },
        { lastName: { contains: t, mode: "insensitive" } },
        { email: { contains: t, mode: "insensitive" } },
        { phone: { contains: t.replace(/\s/g, "") } },
        { phone: { contains: t } },
      ],
    })),
  };
  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      include: { _count: { select: { appointments: { where: { status: "COMPLETED" } } } } },
    }),
    db.customer.count({ where }),
  ]);

  return (
    <>
      <PageHeader eyebrow={`${total} member${total === 1 ? "" : "s"}`} title="Customers" />

      <form className="filters" action="/admin/customers">
        <label className="grow">
          <span className="field-label">Search</span>
          <input type="search" name="q" defaultValue={q} placeholder="Name, email or phone" />
        </label>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
        {q && (
          <Link href="/admin/customers" className="btn btn-ghost">
            Clear
          </Link>
        )}
      </form>

      <Card flush title={q ? `Results for “${q}”` : "All customers"} subtitle={total > PAGE_SIZE ? `Showing the newest ${PAGE_SIZE} of ${total}` : undefined}>
        {customers.length ? (
          <TableWrap>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Tier</th>
                <th className="num">Points</th>
                <th className="num">Wallet</th>
                <th className="num">Visits</th>
                <th>Member since</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="nowrap">
                    <Link href={`/admin/customers/${c.id}`} className="link cell-title">
                      {c.firstName} {c.lastName}
                    </Link>
                    <div className="cell-sub">{c.email}</div>
                  </td>
                  <td className="nowrap">{c.phone || "—"}</td>
                  <td>
                    <TierBadge tier={c.tier} />
                  </td>
                  <td className="num">{c.pointsBalance.toLocaleString()}</td>
                  <td className="num">{c.creditFils ? formatAed(c.creditFils) : <span className="muted">—</span>}</td>
                  <td className="num">{c._count.appointments}</td>
                  <td className="nowrap">{date(c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        ) : (
          <Empty>No customers found.</Empty>
        )}
      </Card>
    </>
  );
}
