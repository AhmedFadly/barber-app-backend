import type { Metadata } from "next";
import Link from "next/link";

import { db } from "@/lib/db";
import { formatAed } from "@/lib/money";

import { ActionForm } from "../_components/action-form";
import { Badge, Card, Empty, Field, Kpi, PageHeader, TableWrap } from "../_components/ui";
import { date, dateTime } from "../_lib/format";
import { issueGiftCard } from "./actions";

export const metadata: Metadata = { title: "Gift cards" };

export default async function GiftCardsPage() {
  const [cards, outstanding, sold] = await Promise.all([
    db.giftCard.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        purchaser: { select: { id: true, firstName: true, lastName: true } },
        redeemedBy: { select: { id: true, firstName: true, lastName: true } },
        payment: { select: { state: true } },
      },
    }),
    db.giftCard.aggregate({ where: { active: true, redeemedAt: null }, _sum: { amountFils: true }, _count: true }),
    db.giftCard.aggregate({ where: { active: true, payment: { state: "SUCCEEDED" } }, _sum: { amountFils: true }, _count: true }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Sold in the app or issued by the shop" title="Gift cards" />

      <div className="kpis">
        <Kpi label="Sold in app" value={formatAed(sold._sum.amountFils ?? 0)} hint={`${sold._count} card${sold._count === 1 ? "" : "s"}`} />
        <Kpi label="Unredeemed" value={formatAed(outstanding._sum.amountFils ?? 0)} hint={`${outstanding._count} active card${outstanding._count === 1 ? "" : "s"}`} />
      </div>

      <div className="split-wide">
        <Card title="All gift cards" flush>
          {cards.length ? (
            <TableWrap>
              <thead>
                <tr>
                  <th>Code</th>
                  <th className="num">Amount</th>
                  <th>Recipient</th>
                  <th>From</th>
                  <th>Status</th>
                  <th>Redeemed by</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((g) => (
                  <tr key={g.id} className={g.active ? undefined : "dim"}>
                    <td className="nowrap">
                      <span className="code-chip">{g.code}</span>
                      <div className="cell-sub">{date(g.createdAt)}</div>
                    </td>
                    <td className="num">{formatAed(g.amountFils)}</td>
                    <td>
                      <div>{g.recipientName}</div>
                      {g.recipientEmail && <div className="cell-sub">{g.recipientEmail}</div>}
                    </td>
                    <td className="nowrap">
                      {g.purchaser ? (
                        <Link href={`/admin/customers/${g.purchaser.id}`} className="link">
                          {g.purchaser.firstName} {g.purchaser.lastName}
                        </Link>
                      ) : (
                        <span className="muted">Shop (complimentary)</span>
                      )}
                    </td>
                    <td>{g.redeemedAt ? <Badge>Redeemed</Badge> : g.active ? <Badge tone="green">Active</Badge> : <Badge tone="amber">Unpaid</Badge>}</td>
                    <td className="nowrap">
                      {g.redeemedBy ? (
                        <>
                          <Link href={`/admin/customers/${g.redeemedBy.id}`} className="link">
                            {g.redeemedBy.firstName} {g.redeemedBy.lastName}
                          </Link>
                          <div className="cell-sub">{g.redeemedAt && dateTime(g.redeemedAt)}</div>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          ) : (
            <Empty>No gift cards yet.</Empty>
          )}
        </Card>

        <Card title="Issue a complimentary card" subtitle="Active immediately — share the code with the recipient">
          <ActionForm action={issueGiftCard} submitLabel="Issue gift card" resetOnSuccess>
            <Field label="Amount (AED)">
              <input type="number" name="amountAed" min={10} max={5000} step="1" required placeholder="200" />
            </Field>
            <Field label="Recipient name">
              <input type="text" name="recipientName" required />
            </Field>
            <Field label="Recipient email (optional)">
              <input type="email" name="recipientEmail" />
            </Field>
            <Field label="Message (optional)">
              <textarea name="message" maxLength={300} style={{ minHeight: 80 }} placeholder="Sorry for the wait — your next visit is on us." />
            </Field>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
