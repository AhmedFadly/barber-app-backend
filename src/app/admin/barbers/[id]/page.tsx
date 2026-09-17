import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";

import { ActionButton } from "../../_components/action-button";
import { ActionForm } from "../../_components/action-form";
import { Card, Empty, Field, PageHeader, TableWrap, Thumb } from "../../_components/ui";
import { dateTime } from "../../_lib/format";
import { addTimeOff, removeTimeOff, updateBarber } from "../actions";
import { BarberForm } from "../barber-form";

export const metadata: Metadata = { title: "Edit barber" };

export default async function EditBarberPage(props: PageProps<"/admin/barbers/[id]">) {
  const { id } = await props.params;
  const [barber, branches, categories] = await Promise.all([
    db.barber.findUnique({
      where: { id },
      include: {
        shifts: { orderBy: { startMin: "asc" } },
        services: { select: { serviceId: true } },
        timeOff: { where: { endsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" } },
        branch: { select: { name: true } },
      },
    }),
    db.branch.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.serviceCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { services: { orderBy: { sortOrder: "asc" } } } }),
  ]);
  if (!barber) notFound();

  return (
    <>
      <PageHeader eyebrow={`${barber.title} · ${barber.branch.name}`} title={barber.name}>
        <Thumb src={barber.photoUrl} alt="" size={56} round />
      </PageHeader>

      <div className="split-wide">
        <Card title="Profile, services & shifts">
          <BarberForm action={updateBarber.bind(null, barber.id)} branches={branches} categories={categories} barber={barber} />
        </Card>

        <div className="stack">
          <Card title="Time off" subtitle="Blocks booking during holidays, sick days, training" flush>
            {barber.timeOff.length ? (
              <TableWrap>
                <thead>
                  <tr>
                    <th>From</th>
                    <th>To</th>
                    <th className="actions" />
                  </tr>
                </thead>
                <tbody>
                  {barber.timeOff.map((t) => (
                    <tr key={t.id}>
                      <td className="nowrap">
                        {dateTime(t.startsAt)}
                        {t.reason && <div className="cell-sub">{t.reason}</div>}
                      </td>
                      <td className="nowrap">{dateTime(t.endsAt)}</td>
                      <td className="actions">
                        <ActionButton action={removeTimeOff.bind(null, t.id)} label="Remove" variant="danger" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableWrap>
            ) : (
              <Empty>No upcoming time off.</Empty>
            )}
          </Card>
          <Card title="Add time off">
            <ActionForm action={addTimeOff.bind(null, barber.id)} submitLabel="Add time off" resetOnSuccess>
              <Field label="From (Dubai time)">
                <input type="datetime-local" name="startsAt" required />
              </Field>
              <Field label="To (Dubai time)">
                <input type="datetime-local" name="endsAt" required />
              </Field>
              <Field label="Reason (optional)">
                <input type="text" name="reason" placeholder="Annual leave" />
              </Field>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
