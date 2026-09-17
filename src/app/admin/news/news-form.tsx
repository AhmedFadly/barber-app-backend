import type { NewsPost } from "@prisma/client";

import { ActionForm } from "../_components/action-form";
import { ButtonLink, Field, Toggle } from "../_components/ui";
import { toLocalInput } from "../_lib/format";
import type { FormState } from "../_lib/form";

export function NewsForm({ action, post }: { action: (fd: FormData) => Promise<FormState>; post?: NewsPost }) {
  return (
    <ActionForm
      action={action}
      submitLabel={post ? "Save post" : "Create post"}
      secondary={
        <ButtonLink href="/admin/news" variant="ghost">
          Back
        </ButtonLink>
      }
    >
      <div className="form-grid">
        <Field label="Title" wide>
          <input type="text" name="title" required defaultValue={post?.title} placeholder="Now open: REGENT Al Maryah Island" />
        </Field>
        <Field label="Summary" hint="Shown on the home screen card and as the push notification text" wide>
          <input type="text" name="summary" required maxLength={200} defaultValue={post?.summary} />
        </Field>
        <Field label="Body" hint="Blank lines separate paragraphs" wide>
          <textarea name="body" required defaultValue={post?.body} style={{ minHeight: 220 }} />
        </Field>
        <Field label="Image URL" wide>
          <input type="url" name="imageUrl" required defaultValue={post?.imageUrl} placeholder="https://…" />
        </Field>
        <Field label="Tag">
          <input type="text" name="tag" required defaultValue={post?.tag ?? "News"} list="news-tags" />
          <datalist id="news-tags">
            <option value="News" />
            <option value="Offer" />
            <option value="New branch" />
            <option value="Our barbers" />
            <option value="Products" />
          </datalist>
        </Field>
        <Field label="Publish at (Dubai time)" hint="Future dates stay hidden until then">
          <input type="datetime-local" name="publishedAt" defaultValue={toLocalInput(post?.publishedAt ?? new Date())} />
        </Field>
      </div>
      <div className="row" style={{ gap: 24 }}>
        <Toggle name="published" label="Published" defaultChecked={post?.published ?? true} />
        <Toggle name="pinned" label="Pin to top" defaultChecked={post?.pinned ?? false} />
      </div>
    </ActionForm>
  );
}
