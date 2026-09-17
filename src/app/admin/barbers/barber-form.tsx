import type { Barber, Branch, Service, ServiceCategory, Shift } from "@prisma/client";

import { ActionForm } from "../_components/action-form";
import { ButtonLink, Field, Toggle } from "../_components/ui";
import { WeekEditor } from "../_components/week-editor";
import type { FormState } from "../_lib/form";

export function BarberForm({
  action,
  branches,
  categories,
  barber,
}: {
  action: (fd: FormData) => Promise<FormState>;
  branches: Pick<Branch, "id" | "name">[];
  categories: (ServiceCategory & { services: Service[] })[];
  barber?: Barber & { shifts: Shift[]; services: { serviceId: string }[] };
}) {
  const offered = new Set(barber?.services.map((s) => s.serviceId));
  const defaultShifts = barber?.shifts ?? [1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMin: 600, endMin: 1140 }));

  return (
    <ActionForm
      action={action}
      submitLabel={barber ? "Save barber" : "Create barber"}
      secondary={
        <ButtonLink href="/admin/barbers" variant="ghost">
          Cancel
        </ButtonLink>
      }
    >
      <div className="form-grid">
        <Field label="Name">
          <input type="text" name="name" required defaultValue={barber?.name} placeholder="Karim Haddad" />
        </Field>
        <Field label="Title">
          <input type="text" name="title" required defaultValue={barber?.title} placeholder="Master Barber" />
        </Field>
        <Field label="Branch">
          <select name="branchId" required defaultValue={barber?.branchId ?? branches[0]?.id}>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Rating" hint="Shown in the app, 0–5">
          <input type="number" name="rating" min={0} max={5} step="0.1" required defaultValue={barber?.rating ?? 5} />
        </Field>
        <Field label="Photo URL" wide>
          <input type="url" name="photoUrl" required defaultValue={barber?.photoUrl} placeholder="https://…" />
        </Field>
        <Field label="Bio" wide>
          <textarea name="bio" defaultValue={barber?.bio} placeholder="A line or two customers see when choosing a barber" />
        </Field>
      </div>
      <Toggle name="active" label="Taking bookings" defaultChecked={barber?.active ?? true} />

      <p className="section-label">Services offered</p>
      <div>
        {categories.map((cat) => (
          <div key={cat.id} className="checks-group">
            <p className="checks-group-title">{cat.name}</p>
            <div className="checks">
              {cat.services.map((s) => (
                <label key={s.id} className="check">
                  <input type="checkbox" name="service" value={s.id} defaultChecked={barber ? offered.has(s.id) : true} />
                  <span>
                    {s.name}
                    {!s.active && <span className="muted small"> (hidden)</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="section-label">Weekly shifts</p>
      <p className="field-hint" style={{ marginTop: -8 }}>
        Bookable times are also limited to the branch&apos;s opening hours.
      </p>
      <WeekEditor prefix="shift" days={defaultShifts} onLabel="Working" fallback={{ startMin: 600, endMin: 1140 }} />
    </ActionForm>
  );
}
