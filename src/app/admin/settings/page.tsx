import type { Metadata } from "next";

import { getSettings } from "@/lib/db";
import { formatAed } from "@/lib/money";
import { paymentsMode } from "@/lib/payments";

import { ActionForm } from "../_components/action-form";
import { Badge, Card, Field, PageHeader } from "../_components/ui";
import { saveSettings } from "./actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getSettings();

  return (
    <>
      <PageHeader eyebrow="Booking, loyalty & notifications" title="Settings" />
      <div className="split-wide">
        <Card>
          <ActionForm action={saveSettings} submitLabel="Save settings">
            <p className="section-label" style={{ borderTop: 0, paddingTop: 0 }}>
              Bookings
            </p>
            <div className="form-grid">
              <Field label="Deposit (%)" hint="Charged by card when booking. 0 = no deposit">
                <input type="number" name="depositPercent" min={0} max={100} required defaultValue={s.depositPercent} />
              </Field>
              <Field label="Free cancellation (hours before)" hint="Later cancellations forfeit the deposit">
                <input type="number" name="cancellationHours" min={0} max={168} required defaultValue={s.cancellationHours} />
              </Field>
              <Field label="Slot interval (minutes)" hint="How often start times are offered">
                <select name="slotStepMin" defaultValue={s.slotStepMin}>
                  {[5, 10, 15, 20, 30, 60].map((n) => (
                    <option key={n} value={n}>
                      Every {n} min
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Booking window (days)" hint="How far ahead customers can book">
                <input type="number" name="bookingWindowDays" min={1} max={365} required defaultValue={s.bookingWindowDays} />
              </Field>
            </div>

            <p className="section-label">Loyalty</p>
            <div className="form-grid">
              <Field label="Points per AED spent" hint="Awarded when a visit is completed">
                <input type="number" name="pointsPerAed" min={0} max={100} required defaultValue={s.pointsPerAed} />
              </Field>
              <div />
              <Field label="Redeem block (points)">
                <input type="number" name="redeemBlockPoints" min={1} required defaultValue={s.redeemBlockPoints} />
              </Field>
              <Field label="…converts to wallet credit (AED)">
                <input type="number" name="redeemBlockAed" min={1} step="0.01" required defaultValue={s.redeemBlockFils / 100} />
              </Field>
              <Field label="Gold tier (lifetime points)">
                <input type="number" name="goldThreshold" min={1} required defaultValue={s.goldThreshold} />
              </Field>
              <Field label="Black tier (lifetime points)">
                <input type="number" name="blackThreshold" min={1} required defaultValue={s.blackThreshold} />
              </Field>
            </div>

            <p className="section-label">Notifications</p>
            <div className="form-grid">
              <Field label="Reminder (hours before)" hint="Push reminder for confirmed appointments">
                <input type="number" name="reminderHoursBefore" min={1} max={72} required defaultValue={s.reminderHoursBefore} />
              </Field>
            </div>
          </ActionForm>
        </Card>

        <div className="stack">
          <Card title="Payments">
            <div className="stack" style={{ gap: 10 }}>
              <div>{paymentsMode === "stripe" ? <Badge tone="green">Stripe connected</Badge> : <Badge tone="amber">Demo mode</Badge>}</div>
              <p className="small muted">
                {paymentsMode === "stripe"
                  ? "Deposits and gift cards are charged through Stripe Checkout in AED."
                  : "No Stripe key is configured, so payments are simulated. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET on the server to take real payments."}
              </p>
            </div>
          </Card>
          <Card title="At a glance">
            <dl className="defs">
              <dt>AED 200 booking</dt>
              <dd>{formatAed(Math.round((20_000 * s.depositPercent) / 100))} deposit</dd>
              <dt>AED 200 visit earns</dt>
              <dd>{(200 * s.pointsPerAed).toLocaleString()} pts</dd>
              <dt>Redeem</dt>
              <dd>
                {s.redeemBlockPoints.toLocaleString()} pts → {formatAed(s.redeemBlockFils)}
              </dd>
              <dt>Effective reward</dt>
              <dd>{s.redeemBlockPoints ? `${((s.redeemBlockFils / 100 / s.redeemBlockPoints) * s.pointsPerAed * 100).toFixed(1)}% back` : "—"}</dd>
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}
