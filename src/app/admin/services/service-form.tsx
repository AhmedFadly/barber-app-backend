import type { Service, ServiceCategory } from "@prisma/client";

import { ActionForm } from "../_components/action-form";
import { ButtonLink, Field, Toggle } from "../_components/ui";
import type { FormState } from "../_lib/form";

export function ServiceForm({ action, categories, service }: { action: (fd: FormData) => Promise<FormState>; categories: ServiceCategory[]; service?: Service }) {
  return (
    <ActionForm
      action={action}
      submitLabel={service ? "Save service" : "Create service"}
      secondary={
        <ButtonLink href="/admin/services" variant="ghost">
          Cancel
        </ButtonLink>
      }
    >
      <div className="form-grid">
        <Field label="Name">
          <input type="text" name="name" required defaultValue={service?.name} placeholder="Signature Haircut" />
        </Field>
        <Field label="Category">
          <select name="categoryId" required defaultValue={service?.categoryId ?? categories[0]?.id}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Description" wide>
          <textarea name="description" required defaultValue={service?.description} placeholder="What's included…" />
        </Field>
        <Field label="Duration (minutes)">
          <input type="number" name="durationMin" min={5} max={480} step={5} required defaultValue={service?.durationMin ?? 30} />
        </Field>
        <Field label="Price (AED)">
          <input type="number" name="priceAed" min={0} step="0.01" required defaultValue={service ? service.priceFils / 100 : undefined} placeholder="150" />
        </Field>
        <Field label="Image URL" wide>
          <input type="url" name="imageUrl" required defaultValue={service?.imageUrl} placeholder="https://…" />
        </Field>
        <Field label="URL slug" hint="Leave blank to generate from the name">
          <input type="text" name="slug" defaultValue={service?.slug} placeholder="signature-haircut" />
        </Field>
        <Field label="Sort order" hint="Lower numbers show first">
          <input type="number" name="sortOrder" min={0} max={999} defaultValue={service?.sortOrder ?? 0} />
        </Field>
      </div>
      <div className="row" style={{ gap: 24 }}>
        <Toggle name="active" label="Bookable in the app" defaultChecked={service?.active ?? true} />
        <Toggle name="popular" label="Show as popular" defaultChecked={service?.popular ?? false} />
      </div>
    </ActionForm>
  );
}
