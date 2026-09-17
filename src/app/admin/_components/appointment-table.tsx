import Link from "next/link";

import { formatAed } from "@/lib/money";

import { cancelAction, completeAction, noShowAction } from "../_lib/appointment-actions";
import { balanceDue, type AdminAppointment } from "../_lib/appointments";
import { date, statusLabel, time } from "../_lib/format";
import { ActionButton } from "./action-button";
import { Badge, Empty, TableWrap } from "./ui";

/** Appointment rows with shop actions. `groupByBranch` inserts a heading row per branch. */
export function AppointmentTable({
  appointments,
  groupByBranch,
  showDate,
  hideCustomer,
  emptyText = "No appointments.",
}: {
  appointments: AdminAppointment[];
  groupByBranch?: boolean;
  showDate?: boolean;
  hideCustomer?: boolean;
  emptyText?: string;
}) {
  if (!appointments.length) return <Empty>{emptyText}</Empty>;

  const groups = groupByBranch
    ? [...new Map(appointments.map((a) => [a.branch.id, a.branch.name])).entries()].map(([id, name]) => ({ id, name, rows: appointments.filter((a) => a.branch.id === id) }))
    : [{ id: "all", name: "", rows: appointments }];
  const cols = 7 + (hideCustomer ? 0 : 1) + (groupByBranch ? 0 : 1);

  return (
    <TableWrap>
      <thead>
        <tr>
          <th>{showDate ? "When" : "Time"}</th>
          {!hideCustomer && <th>Customer</th>}
          <th>Services</th>
          <th>Barber</th>
          {!groupByBranch && <th>Branch</th>}
          <th>Status</th>
          <th className="num">Total</th>
          <th className="num">Due</th>
          <th className="actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((g) => [
          groupByBranch && (
            <tr key={`h-${g.id}`} className="group-head">
              <td colSpan={cols}>
                {g.name} <span className="muted small">· {g.rows.length} booking{g.rows.length === 1 ? "" : "s"}</span>
              </td>
            </tr>
          ),
          ...g.rows.map((a) => {
            const status = statusLabel(a.status, a.createdAt);
            const open = a.status === "CONFIRMED";
            const cancellable = a.status === "CONFIRMED" || (a.status === "PENDING_PAYMENT" && status.label !== "Hold expired");
            return (
              <tr key={a.id} className={a.status === "CANCELLED" || status.label === "Hold expired" ? "dim" : undefined}>
                <td className="nowrap">
                  <div className="cell-title">{time(a.startsAt)}</div>
                  <div className="cell-sub">
                    {showDate ? `${date(a.startsAt)} · ` : ""}
                    {Math.round((a.endsAt.getTime() - a.startsAt.getTime()) / 60_000)} min
                  </div>
                </td>
                {!hideCustomer && (
                  <td className="nowrap">
                    <Link href={`/admin/customers/${a.customer.id}`} className="link cell-title">
                      {a.customer.firstName} {a.customer.lastName}
                    </Link>
                    <div className="cell-sub">{a.customer.phone || "—"}</div>
                  </td>
                )}
                <td style={{ minWidth: 190 }}>
                  <div>{a.items.map((i) => i.name).join(", ")}</div>
                  <div className="cell-sub mono">{a.reference}</div>
                </td>
                <td className="nowrap">{a.barber.name}</td>
                {!groupByBranch && <td className="nowrap">{a.branch.name}</td>}
                <td>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </td>
                <td className="num">{formatAed(a.subtotalFils)}</td>
                <td className="num">{balanceDue(a) ? formatAed(balanceDue(a)) : <span className="muted">—</span>}</td>
                <td className="actions">
                  {open && <ActionButton action={completeAction.bind(null, a.id)} label="Complete" variant="primary" />}
                  {open && <ActionButton action={noShowAction.bind(null, a.id)} label="No-show" confirm="Mark this booking as a no-show? The deposit is kept." />}
                  {cancellable && (
                    <ActionButton action={cancelAction.bind(null, a.id)} label="Cancel" variant="danger" confirm="Cancel this booking? Anything prepaid goes back to the customer's wallet." />
                  )}
                </td>
              </tr>
            );
          }),
        ])}
      </tbody>
    </TableWrap>
  );
}
