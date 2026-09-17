import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db, getSettings } from "@/lib/db";
import { nextTier } from "@/lib/loyalty";
import { formatAed } from "@/lib/money";

import { ActionForm } from "../../_components/action-form";
import { AppointmentTable } from "../../_components/appointment-table";
import { ButtonLink, Card, Empty, Field, Kpi, PageHeader, TableWrap, TierBadge } from "../../_components/ui";
import { adminAppointmentInclude } from "../../_lib/appointments";
import { date, dateTime } from "../../_lib/format";
import { adjustCredit, adjustPoints } from "../actions";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerPage(props: PageProps<"/admin/customers/[id]">) {
  const { id } = await props.params;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const [settings, appointments, points, credit, favourite] = await Promise.all([
    getSettings(),
    db.appointment.findMany({ where: { customerId: id }, orderBy: { startsAt: "desc" }, take: 50, include: adminAppointmentInclude }),
    db.pointsEntry.findMany({ where: { customerId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    db.creditEntry.findMany({ where: { customerId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
    customer.favouriteBarberId ? db.barber.findUnique({ where: { id: customer.favouriteBarberId }, select: { name: true } }) : null,
  ]);
  const completed = appointments.filter((a) => a.status === "COMPLETED");
  const spent = completed.reduce((s, a) => s + a.subtotalFils, 0);
  const noShows = appointments.filter((a) => a.status === "NO_SHOW").length;
  const next = nextTier(customer.lifetimePoints, settings);
  const ledger = [
    ...points.map((p) => ({ id: p.id, when: p.createdAt, reason: p.reason, value: `${p.points > 0 ? "+" : ""}${p.points.toLocaleString()} pts`, positive: p.points > 0 })),
    ...credit.map((c) => ({ id: c.id, when: c.createdAt, reason: c.reason, value: `${c.amountFils > 0 ? "+" : "−"}${formatAed(Math.abs(c.amountFils))}`, positive: c.amountFils > 0 })),
  ].sort((a, b) => +b.when - +a.when);

  return (
    <>
      <PageHeader eyebrow="Customer" title={`${customer.firstName} ${customer.lastName}`}>
        <ButtonLink href="/admin/customers" variant="ghost">
          ← All customers
        </ButtonLink>
      </PageHeader>

      <div className="kpis">
        <Kpi label="Tier" value={<TierBadge tier={customer.tier} />} hint={next ? `${next.pointsNeeded.toLocaleString()} pts to ${next.tier}` : "Top tier"} />
        <Kpi label="Points" value={customer.pointsBalance.toLocaleString()} hint={`${customer.lifetimePoints.toLocaleString()} lifetime`} />
        <Kpi label="Wallet" value={formatAed(customer.creditFils)} />
        <Kpi label="Visits" value={completed.length} hint={`${formatAed(spent)} spent${noShows ? ` · ${noShows} no-show${noShows === 1 ? "" : "s"}` : ""}`} />
      </div>

      <div className="stack">
        <div className="split">
          <Card title="Profile">
            <dl className="defs">
              <dt>Email</dt>
              <dd>{customer.email}</dd>
              <dt>Phone</dt>
              <dd>{customer.phone || "—"}</dd>
              <dt>Birthday</dt>
              <dd>{customer.birthday ? date(customer.birthday) : "—"}</dd>
              <dt>Favourite barber</dt>
              <dd>{favourite?.name ?? "—"}</dd>
              <dt>Referral code</dt>
              <dd>
                <span className="code-chip">{customer.referralCode}</span>
              </dd>
              <dt>Marketing</dt>
              <dd>{customer.marketingOptIn ? "Opted in" : "Opted out"}</dd>
              <dt>Member since</dt>
              <dd>{date(customer.createdAt)}</dd>
            </dl>
          </Card>

          <div className="stack">
            <Card title="Adjust wallet credit" subtitle="Use a negative amount to deduct">
              <ActionForm action={adjustCredit.bind(null, customer.id)} submitLabel="Apply credit" resetOnSuccess>
                <div className="form-grid">
                  <Field label="Amount (AED)">
                    <input type="number" name="amountAed" step="0.01" required placeholder="50" />
                  </Field>
                  <Field label="Reason">
                    <input type="text" name="reason" required placeholder="Goodwill — delayed appointment" />
                  </Field>
                </div>
              </ActionForm>
            </Card>
            <Card title="Adjust points" subtitle="Additions also count towards tier">
              <ActionForm action={adjustPoints.bind(null, customer.id)} submitLabel="Apply points" resetOnSuccess>
                <div className="form-grid">
                  <Field label="Points">
                    <input type="number" name="points" step="1" required placeholder="100" />
                  </Field>
                  <Field label="Reason">
                    <input type="text" name="reason" required placeholder="Birthday bonus" />
                  </Field>
                </div>
              </ActionForm>
            </Card>
          </div>
        </div>

        <Card title="Bookings" subtitle="Most recent 50" flush>
          <AppointmentTable appointments={appointments} showDate hideCustomer emptyText="No bookings yet." />
        </Card>

        <Card title="Points & wallet activity" flush>
          {ledger.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Reason</th>
                  <th className="num">Change</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((l) => (
                  <tr key={l.id}>
                    <td className="nowrap">{dateTime(l.when)}</td>
                    <td>{l.reason}</td>
                    <td className="num" style={{ color: l.positive ? "#8fbf95" : "#e39a8c" }}>
                      {l.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          ) : (
            <Empty>No activity yet.</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
