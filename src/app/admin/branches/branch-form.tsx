import type { Branch } from "@prisma/client";

import { hhmmToMin } from "@/lib/time";

import { ActionForm } from "../_components/action-form";
import { ButtonLink, Field, Toggle } from "../_components/ui";
import { WeekEditor } from "../_components/week-editor";
import type { FormState } from "../_lib/form";

type OpeningHours = { weekday: number; open: string; close: string }[];

export function BranchForm({ action, branch }: { action: (fd: FormData) => Promise<FormState>; branch?: Branch }) {
  const hours = branch
    ? (branch.openingHours as OpeningHours).map((h) => ({ weekday: h.weekday, startMin: hhmmToMin(h.open), endMin: hhmmToMin(h.close) }))
    : [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, startMin: 600, endMin: 1320 }));

  return (
    <ActionForm
      action={action}
      submitLabel={branch ? "Save branch" : "Create branch"}
      secondary={
        <ButtonLink href="/admin/branches" variant="ghost">
          Cancel
        </ButtonLink>
      }
    >
      <div className="form-grid">
        <Field label="Name">
          <input type="text" name="name" required defaultValue={branch?.name} placeholder="City Walk" />
        </Field>
        <Field label="Area / city">
          <input type="text" name="area" required defaultValue={branch?.area} placeholder="Dubai" />
        </Field>
        <Field label="Address" wide>
          <input type="text" name="address" required defaultValue={branch?.address} />
        </Field>
        <Field label="Phone">
          <input type="text" name="phone" required defaultValue={branch?.phone} placeholder="+971 4 555 0101" />
        </Field>
        <Field label="Sort order">
          <input type="number" name="sortOrder" min={0} max={999} defaultValue={branch?.sortOrder ?? 0} />
        </Field>
        <Field label="Latitude" hint="Used for directions in the app">
          <input type="number" name="latitude" step="any" required defaultValue={branch?.latitude} />
        </Field>
        <Field label="Longitude">
          <input type="number" name="longitude" step="any" required defaultValue={branch?.longitude} />
        </Field>
        <Field label="Image URL" wide>
          <input type="url" name="imageUrl" required defaultValue={branch?.imageUrl} placeholder="https://…" />
        </Field>
      </div>
      <Toggle name="active" label="Open for bookings" defaultChecked={branch?.active ?? true} />

      <p className="section-label">Opening hours</p>
      <WeekEditor prefix="hours" days={hours} onLabel="Open" />
    </ActionForm>
  );
}
